(function () {
  "use strict";

  let supabaseClient = null;

  function getClient() {
    const config = window.VP_SUPABASE_CONFIG || {};
    if (!config.url || !config.anonKey) {
      throw new Error("O Supabase ainda não foi configurado.");
    }
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("Não foi possível carregar a conexão do Supabase.");
    }
    if (!supabaseClient) {
      supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    return supabaseClient;
  }

  function adminQuery(client) {
    return client.from("vp_admins").select("user_id").limit(1).maybeSingle();
  }

  function normalizeLead(row) {
    const created = row.created_at ? new Date(row.created_at) : new Date();
    return {
      ...row,
      pain: Array.isArray(row.pain) ? row.pain : [],
      info: Array.isArray(row.info) ? row.info : [],
      data: row.data_original || created.toLocaleDateString("pt-BR"),
      hora: row.hora_original || created.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };
  }

  function toLeadRow(lead) {
    const row = {
      submission_id: lead.submission_id || null,
      nome: String(lead.nome || "").trim(),
      empresa: String(lead.empresa || "").trim(),
      wh: String(lead.wh || "").trim(),
      seg: String(lead.seg || ""),
      size: String(lead.size || ""),
      pain: Array.isArray(lead.pain) ? lead.pain : [],
      info: Array.isArray(lead.info) ? lead.info : [],
      doc: String(lead.doc || ""),
      dec: String(lead.dec || ""),
      nivel: Number(lead.nivel || 0),
      nome_nivel: String(lead.nome_nivel || ""),
      coluna: lead.coluna || "novo",
      notas: String(lead.notas || ""),
      origem: lead.origem || "diagnostico"
    };
    if (lead.legacy_id != null) row.legacy_id = Number(lead.legacy_id);
    if (lead.data_original != null) row.data_original = String(lead.data_original);
    if (lead.hora_original != null) row.hora_original = String(lead.hora_original);
    return row;
  }

  window.VPAuth = {
    isConfigured: function () {
      const config = window.VP_SUPABASE_CONFIG || {};
      return Boolean(config.url && config.anonKey);
    },
    signIn: async function (email, password) {
      const { data, error } = await getClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data.session;
    },
    signOut: async function () {
      const { error } = await getClient().auth.signOut();
      if (error) throw error;
    },
    getSession: async function () {
      const { data, error } = await getClient().auth.getSession();
      if (error) throw error;
      return data.session;
    },
    isAdmin: async function () {
      const client = getClient();
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) return false;
      const { data, error } = await adminQuery(client);
      if (error) throw error;
      return Boolean(data && data.user_id === sessionData.session.user.id);
    }
  };

  window.VPLeads = {
    create: async function (lead) {
      const client = getClient();
      const row = toLeadRow(lead);
      if (row.submission_id) {
        const { error } = await client.from("vp_leads").upsert(row, {
          onConflict: "submission_id",
          ignoreDuplicates: true
        });
        if (error) throw error;
        return row;
      }
      const { data, error } = await client.from("vp_leads").insert(row).select("*").single();
      if (error) throw error;
      return normalizeLead(data);
    },
    list: async function () {
      const { data, error } = await getClient()
        .from("vp_leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(normalizeLead);
    },
    update: async function (id, patch) {
      const safePatch = {};
      if (Object.prototype.hasOwnProperty.call(patch, "coluna")) safePatch.coluna = patch.coluna;
      if (Object.prototype.hasOwnProperty.call(patch, "notas")) safePatch.notas = String(patch.notas || "");
      const { data, error } = await getClient()
        .from("vp_leads").update(safePatch).eq("id", id).select("*").single();
      if (error) throw error;
      return normalizeLead(data);
    },
    remove: async function (id) {
      const { error } = await getClient().from("vp_leads").delete().eq("id", id);
      if (error) throw error;
    },
    importLegacy: async function (records) {
      const client = getClient();
      for (let offset = 0; offset < records.length; offset += 100) {
        const batch = records.slice(offset, offset + 100).map(function (record) {
          const legacyId = Number(record.id);
          if (!Number.isSafeInteger(legacyId)) {
            throw new Error("Existe um lead local sem ID válido para importação.");
          }
          return { ...toLeadRow({
            ...record,
            submission_id: null,
            legacy_id: legacyId,
            data_original: record.data || null,
            hora_original: record.hora || null
          }), submission_id: null };
        });
        const { error } = await client.from("vp_leads").upsert(batch, {
          onConflict: "legacy_id",
          ignoreDuplicates: true
        });
        if (error) throw error;
      }
    }
  };
})();
