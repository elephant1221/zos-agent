import { createClient } from "npm:@supabase/supabase-js@2";
import { createKnowledgeApiHandler } from "./handler.ts";

const PUBLIC_API_KEY =
  Deno.env.get("ZOS_KNOWLEDGE_API_KEY") ?? "";

const MPBSDP_INGEST_KEY =
  Deno.env.get("ZOS_MPBSDP_INGEST_KEY") ?? "";

const PUBLISH_APPROVAL_KEY =
  Deno.env.get("ZOS_PUBLISH_APPROVAL_KEY") ?? "";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? "";

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

const publicV12Handler = createKnowledgeApiHandler({
  supabaseUrl: SUPABASE_URL,
  serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  publicApiKey: PUBLIC_API_KEY,
  rpc: async (name, args) => {
    return await supabase.rpc(name, args);
  },
});

const PUBLIC_V1_2_ACTIONS = new Set([
  "health",
  "search",
  "record",
  "create_candidate",
  "add_observation"
]);

function jsonError(
  error: string,
  message: string,
  status = 400
) {
  return Response.json(
    {
      status: "error",
      error,
      message
    },
    { status }
  );
}

function publicAuthorized(req: Request) {
  const supplied =
    req.headers.get("X-ZOS-Knowledge-Key") ?? "";

  return (
    PUBLIC_API_KEY.length > 0 &&
    supplied === PUBLIC_API_KEY
  );
}

function mpbsdpAuthorized(req: Request) {
  const supplied =
    req.headers.get("X-ZOS-MPBSDP-Ingest-Key") ?? "";

  return (
    MPBSDP_INGEST_KEY.length > 0 &&
    supplied === MPBSDP_INGEST_KEY
  );
}

function publishAuthorized(req: Request) {
  const supplied =
    req.headers.get("X-ZOS-Publish-Approval-Key") ?? "";

  return (
    PUBLISH_APPROVAL_KEY.length > 0 &&
    supplied === PUBLISH_APPROVAL_KEY
  );
}

function validateCandidateBody(body: any) {
  if (
    !body?.record_type ||
    !["KNOWLEDGE", "EXPERIENCE"].includes(
      body.record_type
    )
  ) {
    return {
      error: "invalid_record_type",
      message:
        "record_type must be KNOWLEDGE or EXPERIENCE"
    };
  }

  if (
    typeof body?.component !== "string" ||
    !body.component.trim()
  ) {
    return {
      error: "invalid_component",
      message: "component is required"
    };
  }

  if (
    typeof body?.title !== "string" ||
    !body.title.trim()
  ) {
    return {
      error: "invalid_title",
      message: "title is required"
    };
  }

  if (
    !body?.content ||
    typeof body.content !== "object" ||
    Array.isArray(body.content)
  ) {
    return {
      error: "invalid_content",
      message: "content must be an object"
    };
  }

  return null;
}

function componentForId(component: string) {
  const cleaned = component
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "GENERAL";
}

function makeRecordId(
  recordType: string,
  component: string
) {
  const typeCode =
    recordType === "EXPERIENCE" ? "E" : "K";

  return `PUB-${typeCode}-${componentForId(
    component
  )}-${crypto.randomUUID()}`;
}

async function insertCreatedAuditEvent(
  record: any,
  actorDomain: "PUBLIC_GPT" | "MPBSDP"
) {
  const { data, error } = await supabase
    .from("record_events")
    .insert({
      record_id: record.id,
      event_type: "CREATED",
      actor_domain: actorDomain,
      from_status: null,
      to_status: record.status,
      details: {
        record_type: record.record_type,
        component: record.component,
        maturity: record.maturity,
        privacy_status: record.privacy_status
      }
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `created_audit_failed: ${error.message}`
    );
  }

  return data;
}

async function insertObservationAuditEvent(
  observation: any,
  record: any,
  actorDomain: "PUBLIC_GPT" | "MPBSDP"
) {
  const { data, error } = await supabase
    .from("record_events")
    .insert({
      record_id: record.id,
      event_type: "OBSERVATION_ADDED",
      actor_domain: actorDomain,
      from_status: record.status,
      to_status: record.status,
      details: {
        observation_id: observation.id,
        case_fingerprint:
          observation.case_fingerprint,
        source_type: observation.source_type,
        validated: observation.validated,
        independent: observation.independent,
        privacy_status:
          observation.privacy_status
      }
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `observation_audit_failed: ${error.message}`
    );
  }

  return data;
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);

    const action =
      (url.searchParams.get("action") ?? "")
        .trim()
        .toLowerCase();

    /*
     * CORS / preflight support.
     */
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "content-type, x-zos-knowledge-key, x-zos-mpbsdp-ingest-key, x-zos-publish-approval-key",
          "Access-Control-Allow-Methods":
            "GET, POST, OPTIONS"
        }
      });
    }

    /*
     * ----------------------------------------------------
     * PUBLIC V1.2 RPC API DISPATCH
     * ----------------------------------------------------
     *
     * Public actions are handled by handler.ts/domain.ts and
     * the four compatibility RPCs. Trusted MPBSDP ingestion
     * and publication routes below remain unchanged.
     */
    if (PUBLIC_V1_2_ACTIONS.has(action)) {
      return await publicV12Handler(req);
    }

    /*
     * ----------------------------------------------------
     * PUBLIC READ API
     * ----------------------------------------------------
     */

    if (
      action === "health" ||
      action === "search" ||
      action === "record"
    ) {
      if (!publicAuthorized(req)) {
        return jsonError(
          "unauthorized",
          "Valid API key required",
          401
        );
      }
    }

    /*
     * HEALTH
     */
    if (
      req.method === "GET" &&
      action === "health"
    ) {
      return Response.json({
        status: "ok",
        service: "zOS Agent Knowledge Service",
        version: "1.0"
      });
    }

    /*
     * SEARCH
     *
     * Public visibility:
     * status=PUBLISHED
     * privacy_status=PASS
     *
     * Search upgrade:
     * multi-keyword matching across:
     * - title
     * - component
     * - content
     * - applicability
     */
    if (
      req.method === "GET" &&
      action === "search"
    ) {
      const q =
        (url.searchParams.get("q") ?? "")
          .trim();

      const component =
        (
          url.searchParams.get("component") ??
          ""
        ).trim();

      const recordType =
        (
          url.searchParams.get(
            "record_type"
          ) ?? ""
        ).trim();

      const rawLimit = Number(
        url.searchParams.get("limit") ?? "20"
      );

      const limit =
        Number.isFinite(rawLimit) &&
        rawLimit > 0
          ? Math.min(
              Math.floor(rawLimit),
              20
            )
          : 20;

      if (
        recordType &&
        ![
          "KNOWLEDGE",
          "EXPERIENCE"
        ].includes(recordType)
      ) {
        return jsonError(
          "invalid_record_type",
          "record_type must be KNOWLEDGE or EXPERIENCE",
          400
        );
      }

      /*
       * Only fetch records already inside
       * the public visibility boundary.
       */
      let query = supabase
        .from("records")
        .select("*")
        .eq("status", "PUBLISHED")
        .eq("privacy_status", "PASS")
        .order("updated_at", {
          ascending: false
        })
        .limit(200);

      if (component) {
        query = query.ilike(
          "component",
          component
        );
      }

      if (recordType) {
        query = query.eq(
          "record_type",
          recordType
        );
      }

      const {
        data,
        error
      } = await query;

      if (error) {
        return jsonError(
          "search_failed",
          error.message,
          500
        );
      }

      const records = data ?? [];

      /*
       * Empty q = filtered public list.
       */
      if (!q) {
        const visible =
          records.slice(0, limit);

        return Response.json({
          status: "ok",
          query: {
            q,
            component:
              component || null,
            record_type:
              recordType || null,
            limit
          },
          visibility: {
            status: "PUBLISHED",
            privacy_status: "PASS"
          },
          count: visible.length,
          records: visible
        });
      }

      /*
       * Normalize query.
       *
       * Example:
       * atomic regression testing
       *
       * becomes:
       * atomic
       * regression
       * testing
       */
      const normalizedQuery = q
        .toLowerCase()
        .replace(
          /[^a-z0-9/_.+#-]+/g,
          " "
        )
        .replace(/\s+/g, " ")
        .trim();

      const terms = [
        ...new Set(
          normalizedQuery
            .split(" ")
            .map(
              (term) =>
                term.trim()
            )
            .filter(
              (term) =>
                term.length >= 2
            )
        )
      ];

      if (terms.length === 0) {
        return Response.json({
          status: "ok",
          query: {
            q,
            terms,
            component:
              component || null,
            record_type:
              recordType || null,
            limit
          },
          visibility: {
            status: "PUBLISHED",
            privacy_status: "PASS"
          },
          count: 0,
          records: []
        });
      }

      const scored = records
        .map((record: any) => {
          const title = String(
            record.title ?? ""
          ).toLowerCase();

          const componentText =
            String(
              record.component ?? ""
            ).toLowerCase();

          const content =
            JSON.stringify(
              record.content ?? {}
            ).toLowerCase();

          const applicability =
            JSON.stringify(
              record.applicability ?? {}
            ).toLowerCase();

          const combined =
            `${title} ${componentText} ${content} ${applicability}`;

          let score = 0;
          let matchedTerms = 0;

          for (const term of terms) {
            let matched = false;

            /*
             * Strongest weight: title.
             */
            if (
              title.includes(term)
            ) {
              score += 5;
              matched = true;
            }

            /*
             * Component.
             */
            if (
              componentText.includes(
                term
              )
            ) {
              score += 3;
              matched = true;
            }

            /*
             * Generalized content.
             */
            if (
              content.includes(term)
            ) {
              score += 2;
              matched = true;
            }

            /*
             * Applicability.
             */
            if (
              applicability.includes(
                term
              )
            ) {
              score += 1;
              matched = true;
            }

            if (matched) {
              matchedTerms += 1;
            }
          }

          /*
           * Bonus for exact phrase match.
           */
          if (
            combined.includes(
              normalizedQuery
            )
          ) {
            score += 10;
          }

          /*
           * Reward multiple matched terms.
           */
          score +=
            matchedTerms * 2;

          return {
            record,
            score,
            matchedTerms
          };
        })
        .filter(
          (item) =>
            item.matchedTerms > 0
        )
        .sort((a, b) => {
          /*
           * First rank by number of
           * different query terms matched.
           */
          if (
            b.matchedTerms !==
            a.matchedTerms
          ) {
            return (
              b.matchedTerms -
              a.matchedTerms
            );
          }

          /*
           * Then rank by weighted score.
           */
          return b.score - a.score;
        });

      const visible = scored
        .slice(0, limit)
        .map(
          (item) => item.record
        );

      return Response.json({
        status: "ok",
        query: {
          q,
          terms,
          component:
            component || null,
          record_type:
            recordType || null,
          limit
        },
        visibility: {
          status: "PUBLISHED",
          privacy_status: "PASS"
        },
        count: visible.length,
        records: visible
      });
    }

    /*
     * RECORD
     *
     * Direct lookup is also restricted to
     * PUBLISHED + PASS.
     */
    if (
      req.method === "GET" &&
      action === "record"
    ) {
      const recordId =
        (
          url.searchParams.get("id") ??
          ""
        ).trim();

      if (!recordId) {
        return jsonError(
          "missing_record_id",
          "id is required",
          400
        );
      }

      const {
        data,
        error
      } = await supabase
        .from("records")
        .select("*")
        .eq("id", recordId)
        .eq("status", "PUBLISHED")
        .eq(
          "privacy_status",
          "PASS"
        )
        .maybeSingle();

      if (error) {
        return jsonError(
          "record_lookup_failed",
          error.message,
          500
        );
      }

      if (!data) {
        return jsonError(
          "record_not_found",
          "Record not found or not publicly visible",
          404
        );
      }

      return Response.json({
        status: "ok",
        record: data
      });
    }

    /*
     * ----------------------------------------------------
     * PUBLIC WRITE API
     * ----------------------------------------------------
     */

    if (
      action === "create_candidate" ||
      action === "add_observation"
    ) {
      if (!publicAuthorized(req)) {
        return jsonError(
          "unauthorized",
          "Valid API key required",
          401
        );
      }
    }

    /*
     * PUBLIC CREATE CANDIDATE
     */
    if (
      req.method === "POST" &&
      action === "create_candidate"
    ) {
      const body =
        await req.json();

      const validation =
        validateCandidateBody(body);

      if (validation) {
        return jsonError(
          validation.error,
          validation.message,
          400
        );
      }

      const recordId =
        makeRecordId(
          body.record_type,
          body.component
        );

      const maturity =
        body.record_type ===
        "EXPERIENCE"
          ? "OBSERVED"
          : null;

      const record = {
        id: recordId,
        record_type:
          body.record_type,
        component:
          body.component.trim(),
        title:
          body.title.trim(),
        content:
          body.content,
        status:
          "CANDIDATE",
        maturity,
        applicability:
          body.applicability ??
          null,
        provenance: {
          source_type:
            "PUBLIC_GPT",
          ingestion_method:
            "CREATE_CANDIDATE_API",
          raw_evidence_included:
            false
        },
        privacy_status:
          "UNASSESSED"
      };

      const {
        data,
        error
      } = await supabase
        .from("records")
        .insert(record)
        .select("*")
        .single();

      if (error) {
        return jsonError(
          "candidate_create_failed",
          error.message,
          500
        );
      }

      let auditEvent = null;

      try {
        auditEvent =
          await insertCreatedAuditEvent(
            data,
            "PUBLIC_GPT"
          );
      } catch (auditError) {
        return jsonError(
          "audit_failed",
          String(auditError),
          500
        );
      }

      return Response.json(
        {
          status: "ok",
          record_id: data.id,
          record: data,
          audit_event:
            auditEvent
        },
        { status: 201 }
      );
    }

    /*
     * PUBLIC ADD OBSERVATION
     *
     * Public GPT cannot self-validate or
     * declare independence.
     */
    if (
      req.method === "POST" &&
      action === "add_observation"
    ) {
      const body =
        await req.json();

      const recordId =
        typeof body?.record_id ===
        "string"
          ? body.record_id.trim()
          : "";

      const caseFingerprint =
        typeof body
          ?.case_fingerprint ===
        "string"
          ? body.case_fingerprint.trim()
          : "";

      if (!recordId) {
        return jsonError(
          "missing_record_id",
          "record_id is required",
          400
        );
      }

      if (!caseFingerprint) {
        return jsonError(
          "missing_case_fingerprint",
          "case_fingerprint is required",
          400
        );
      }

      const {
        data: record,
        error: recordError
      } = await supabase
        .from("records")
        .select("*")
        .eq("id", recordId)
        .maybeSingle();

      if (recordError) {
        return jsonError(
          "record_lookup_failed",
          recordError.message,
          500
        );
      }

      if (!record) {
        return jsonError(
          "record_not_found",
          "Record not found",
          404
        );
      }

      const observation = {
        record_id:
          recordId,
        case_fingerprint:
          caseFingerprint,
        validated: false,
        independent: false,
        result:
          typeof body?.result ===
          "string"
            ? body.result
            : null,
        source_type:
          "PUBLIC_GPT",
        privacy_status:
          "UNASSESSED"
      };

      const {
        data,
        error
      } = await supabase
        .from("observations")
        .insert(observation)
        .select("*")
        .single();

      if (error) {
        if (
          error.code === "23505"
        ) {
          return jsonError(
            "duplicate_observation",
            "Observation already exists for this record and case_fingerprint",
            409
          );
        }

        return jsonError(
          "observation_create_failed",
          error.message,
          500
        );
      }

      const {
        data: refreshedRecord,
        error:
          refreshedRecordError
      } = await supabase
        .from("records")
        .select("*")
        .eq("id", recordId)
        .single();

      if (
        refreshedRecordError
      ) {
        return jsonError(
          "record_refresh_failed",
          refreshedRecordError.message,
          500
        );
      }

      let auditEvent = null;

      try {
        auditEvent =
          await insertObservationAuditEvent(
            data,
            refreshedRecord,
            "PUBLIC_GPT"
          );
      } catch (auditError) {
        return jsonError(
          "audit_failed",
          String(auditError),
          500
        );
      }

      return Response.json(
        {
          status: "ok",
          observation: data,
          record:
            refreshedRecord,
          maturity:
            refreshedRecord.maturity,
          audit_event:
            auditEvent
        },
        { status: 201 }
      );
    }

    /*
     * ----------------------------------------------------
     * TRUSTED MPBSDP INGESTION
     * ----------------------------------------------------
     */

    if (
      action ===
        "mpbsdp_create_candidate" ||
      action ===
        "mpbsdp_add_observation"
    ) {
      if (!mpbsdpAuthorized(req)) {
        return jsonError(
          "unauthorized",
          "Valid MPBSDP ingest key required",
          401
        );
      }
    }

    /*
     * TRUSTED MPBSDP CREATE CANDIDATE
     */
    if (
      req.method === "POST" &&
      action ===
        "mpbsdp_create_candidate"
    ) {
      const body =
        await req.json();

      const validation =
        validateCandidateBody(body);

      if (validation) {
        return jsonError(
          validation.error,
          validation.message,
          400
        );
      }

      const recordId =
        makeRecordId(
          body.record_type,
          body.component
        );

      const maturity =
        body.record_type ===
        "EXPERIENCE"
          ? "OBSERVED"
          : null;

      const record = {
        id: recordId,
        record_type:
          body.record_type,
        component:
          body.component.trim(),
        title:
          body.title.trim(),
        content:
          body.content,
        status:
          "CANDIDATE",
        maturity,
        applicability:
          body.applicability ??
          null,
        provenance: {
          source_type:
            "MPBSDP",
          ingestion_method:
            "TRUSTED_MPBSDP_INGEST",
          raw_evidence_included:
            false,
          sanitized: true,
          generalized: true
        },
        privacy_status:
          "PASS"
      };

      const {
        data,
        error
      } = await supabase
        .from("records")
        .insert(record)
        .select("*")
        .single();

      if (error) {
        return jsonError(
          "candidate_create_failed",
          error.message,
          500
        );
      }

      let auditEvent = null;

      try {
        auditEvent =
          await insertCreatedAuditEvent(
            data,
            "MPBSDP"
          );
      } catch (auditError) {
        return jsonError(
          "audit_failed",
          String(auditError),
          500
        );
      }

      return Response.json(
        {
          status: "ok",
          record_id: data.id,
          record: data,
          audit_event:
            auditEvent
        },
        { status: 201 }
      );
    }

    /*
     * TRUSTED MPBSDP ADD OBSERVATION
     *
     * These values are server-controlled.
     */
    if (
      req.method === "POST" &&
      action ===
        "mpbsdp_add_observation"
    ) {
      const body =
        await req.json();

      const recordId =
        typeof body?.record_id ===
        "string"
          ? body.record_id.trim()
          : "";

      const caseFingerprint =
        typeof body
          ?.case_fingerprint ===
        "string"
          ? body.case_fingerprint.trim()
          : "";

      if (!recordId) {
        return jsonError(
          "missing_record_id",
          "record_id is required",
          400
        );
      }

      if (!caseFingerprint) {
        return jsonError(
          "missing_case_fingerprint",
          "case_fingerprint is required",
          400
        );
      }

      const {
        data: record,
        error: recordError
      } = await supabase
        .from("records")
        .select("*")
        .eq("id", recordId)
        .maybeSingle();

      if (recordError) {
        return jsonError(
          "record_lookup_failed",
          recordError.message,
          500
        );
      }

      if (!record) {
        return jsonError(
          "record_not_found",
          "Record not found",
          404
        );
      }

      const observation = {
        record_id:
          recordId,
        case_fingerprint:
          caseFingerprint,
        validated: true,
        independent: true,
        result:
          typeof body?.result ===
          "string"
            ? body.result
            : null,
        source_type:
          "MPBSDP",
        privacy_status:
          "PASS"
      };

      const {
        data,
        error
      } = await supabase
        .from("observations")
        .insert(observation)
        .select("*")
        .single();

      if (error) {
        if (
          error.code === "23505"
        ) {
          return jsonError(
            "duplicate_observation",
            "Observation already exists for this record and case_fingerprint",
            409
          );
        }

        return jsonError(
          "observation_create_failed",
          error.message,
          500
        );
      }

      /*
       * Trigger may have updated maturity.
       * Reload the record after observation insert.
       */
      const {
        data: refreshedRecord,
        error:
          refreshedRecordError
      } = await supabase
        .from("records")
        .select("*")
        .eq("id", recordId)
        .single();

      if (
        refreshedRecordError
      ) {
        return jsonError(
          "record_refresh_failed",
          refreshedRecordError.message,
          500
        );
      }

      let auditEvent = null;

      try {
        auditEvent =
          await insertObservationAuditEvent(
            data,
            refreshedRecord,
            "MPBSDP"
          );
      } catch (auditError) {
        return jsonError(
          "audit_failed",
          String(auditError),
          500
        );
      }

      return Response.json(
        {
          status: "ok",
          observation: data,
          record:
            refreshedRecord,
          maturity:
            refreshedRecord.maturity,
          audit_event:
            auditEvent
        },
        { status: 201 }
      );
    }

    /*
     * ----------------------------------------------------
     * PUBLICATION APPROVAL
     * ----------------------------------------------------
     */

    if (
      action ===
      "publish_record"
    ) {
      if (!publishAuthorized(req)) {
        return jsonError(
          "unauthorized",
          "Valid publication approval key required",
          401
        );
      }
    }

    /*
     * ATOMIC PUBLISH
     *
     * Database RPC performs:
     * - row lock
     * - gate validation
     * - status update
     * - PUBLISHED audit event
     *
     * in one database transaction.
     */
    if (
      req.method === "POST" &&
      action ===
        "publish_record"
    ) {
      const body =
        await req.json();

      const recordId =
        typeof body?.record_id ===
        "string"
          ? body.record_id.trim()
          : "";

      if (!recordId) {
        return jsonError(
          "missing_record_id",
          "record_id is required",
          400
        );
      }

      const {
        data,
        error
      } = await supabase.rpc(
        "publish_record_atomic",
        {
          p_record_id:
            recordId
        }
      );

      if (error) {
        const message =
          error.message ?? "";

        if (
          message.includes(
            "record_not_found"
          )
        ) {
          return jsonError(
            "record_not_found",
            "Record not found",
            404
          );
        }

        if (
          message.includes(
            "invalid_publication_state"
          )
        ) {
          return jsonError(
            "invalid_publication_state",
            "Record is not in a publishable state",
            409
          );
        }

        if (
          message.includes(
            "privacy_gate_failed"
          )
        ) {
          return jsonError(
            "privacy_gate_failed",
            "Record privacy status is not PASS",
            409
          );
        }

        if (
          message.includes(
            "provenance_gate_failed"
          )
        ) {
          return jsonError(
            "provenance_gate_failed",
            "Record provenance is not trusted MPBSDP",
            409
          );
        }

        if (
          message.includes(
            "raw_evidence_gate_failed"
          )
        ) {
          return jsonError(
            "raw_evidence_gate_failed",
            "Record indicates raw evidence is included",
            409
          );
        }

        if (
          message.includes(
            "sanitization_gate_failed"
          )
        ) {
          return jsonError(
            "sanitization_gate_failed",
            "Record is not marked sanitized",
            409
          );
        }

        if (
          message.includes(
            "generalization_gate_failed"
          )
        ) {
          return jsonError(
            "generalization_gate_failed",
            "Record is not marked generalized",
            409
          );
        }

        if (
          message.includes(
            "maturity_gate_failed"
          )
        ) {
          return jsonError(
            "maturity_gate_failed",
            "EXPERIENCE record has insufficient maturity for publication",
            409
          );
        }

        return jsonError(
          "atomic_publish_failed",
          message,
          500
        );
      }

      return Response.json(data);
    }

    /*
     * Unknown route/action.
     */
    return jsonError(
      "invalid_action",
      "Unsupported action or HTTP method",
      404
    );
  } catch (error) {
    console.error(error);

    return jsonError(
      "internal_error",
      error instanceof Error
        ? error.message
        : String(error),
      500
    );
  }
});