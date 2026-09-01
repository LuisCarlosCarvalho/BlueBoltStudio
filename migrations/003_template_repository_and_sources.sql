-- ==============================================================================
-- Blue Bolt Page Studio - Phase 2 Migration
-- Migration: 003_template_repository_and_sources.sql
-- Creates templates, template_versions, and project_content_sources tables.
-- ==============================================================================

DO $$
BEGIN
    -- 1. Table: templates
    CREATE TABLE IF NOT EXISTS public.templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        preview_image_url TEXT,
        schema JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
        created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_templates_status_category ON public.templates(status, category);
    CREATE INDEX IF NOT EXISTS idx_templates_slug ON public.templates(slug);

    -- 2. Table: template_versions (Immutable history of template schemas)
    CREATE TABLE IF NOT EXISTS public.template_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        schema JSONB NOT NULL,
        change_note TEXT,
        created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_template_version UNIQUE (template_id, version)
    );

    CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON public.template_versions(template_id);

    -- 3. Table: project_content_sources (Prepares client briefing and content mapping)
    CREATE TABLE IF NOT EXISTS public.project_content_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
        source_type TEXT NOT NULL DEFAULT 'pasted_text' CHECK (source_type IN ('pasted_text', 'txt_file', 'docx_file', 'pdf_file')),
        original_filename TEXT,
        extracted_text TEXT NOT NULL,
        created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_project_content_sources_project_id ON public.project_content_sources(project_id);

    -- 4. Seed development example template: "Serviços Profissionais"
    IF NOT EXISTS (SELECT 1 FROM public.templates WHERE slug = 'servicos-profissionais') THEN
        INSERT INTO public.templates (
            name,
            slug,
            category,
            description,
            preview_image_url,
            status,
            schema
        ) VALUES (
            'Serviços Profissionais',
            'servicos-profissionais',
            'Serviços',
            'Template estruturado de alta conversão para consultorias, agências e prestadores de serviços qualificados.',
            'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
            'active',
            '{
              "schema_version": "1.0.0",
              "template_name": "Serviços Profissionais",
              "category": "Serviços",
              "design_tokens": {
                "colors": {
                  "primary": "#064B88",
                  "accent": "#1463FF",
                  "background": "#F8FAFC",
                  "text": "#0F172A"
                },
                "typography": {
                  "heading_font": "Inter",
                  "body_font": "Inter"
                },
                "spacing": {
                  "section_padding": "py-20",
                  "container_max_width": "max-w-7xl"
                }
              },
              "sections": [
                {
                  "id": "hero_main",
                  "type": "hero",
                  "label": "Secção Hero Principal",
                  "purpose": "Apresentar a proposta de valor irresistível e captar a atenção imediata com CTA principal.",
                  "required": true,
                  "editable_fields": [
                    { "key": "headline", "label": "Título Principal (Headline)", "field_type": "text", "required": true, "placeholder": "Transforme os resultados do seu negócio com especialistas", "ai_hint": "Título curto de alto impacto focado no benefício principal" },
                    { "key": "subheadline", "label": "Subtítulo Persuasivo", "field_type": "textarea", "required": true, "placeholder": "Ajudamos empresas a escalar com estratégias comprovadas e soluções à medida.", "ai_hint": "Descrição complementar curta explicando como resolve a dor do cliente" },
                    { "key": "badge", "label": "Etiqueta / Badge Superior", "field_type": "text", "required": false, "placeholder": "Líder de Mercado 2026", "ai_hint": "Prova social curta ou credencial" },
                    { "key": "cta_text", "label": "Texto do Botão Principal", "field_type": "cta", "required": true, "placeholder": "Agendar Consulta Gratuita", "ai_hint": "Ação principal de conversão" },
                    { "key": "cta_url", "label": "Link de Ação (URL ou Âncora)", "field_type": "url", "required": true, "placeholder": "#contact-form", "ai_hint": "Destino do clique do botão" }
                  ]
                },
                {
                  "id": "benefits_grid",
                  "type": "benefits",
                  "label": "Benefícios Estratégicos",
                  "purpose": "Evidenciar as 3 maiores vantagens competitivas do cliente.",
                  "required": true,
                  "editable_fields": [
                    { "key": "section_title", "label": "Título dos Benefícios", "field_type": "text", "required": true, "placeholder": "Porquê escolher os nossos serviços", "ai_hint": "Título que introduz as vantagens" },
                    { "key": "items", "label": "Lista de Benefícios", "field_type": "card_list", "required": true, "placeholder": "Lista com título e descrição para 3 a 4 benefícios principais", "ai_hint": "Pontos fortes que diferenciam a empresa da concorrência" }
                  ]
                },
                {
                  "id": "services_catalog",
                  "type": "services",
                  "label": "Catálogo de Serviços / Soluções",
                  "purpose": "Apresentar detalhadamente o portfólio de serviços prestados.",
                  "required": true,
                  "editable_fields": [
                    { "key": "section_title", "label": "Título da Secção de Serviços", "field_type": "text", "required": true, "placeholder": "Soluções completas para cada etapa", "ai_hint": "Título da oferta" },
                    { "key": "services_list", "label": "Lista de Serviços", "field_type": "card_list", "required": true, "placeholder": "Cartões com nome do serviço, descrição e destaques", "ai_hint": "Descrição clara de cada serviço oferecido" }
                  ]
                },
                {
                  "id": "process_timeline",
                  "type": "process",
                  "label": "Processo de Trabalho Passo a Passo",
                  "purpose": "Reduzir o atrito demonstrando a clareza e facilidade de contratação e execução.",
                  "required": false,
                  "editable_fields": [
                    { "key": "section_title", "label": "Título do Processo", "field_type": "text", "required": true, "placeholder": "Como trabalhamos consigo", "ai_hint": "Título do fluxo operacional" },
                    { "key": "steps", "label": "Passos do Método", "field_type": "list", "required": true, "placeholder": "1. Diagnóstico -> 2. Estratégia -> 3. Execução -> 4. Resultados", "ai_hint": "Etapas cronológicas simples" }
                  ]
                },
                {
                  "id": "testimonials_carousel",
                  "type": "testimonials",
                  "label": "Testemunhos e Prova Social",
                  "purpose": "Gerar confiança com histórias reais de sucesso.",
                  "required": false,
                  "editable_fields": [
                    { "key": "section_title", "label": "Título dos Testemunhos", "field_type": "text", "required": true, "placeholder": "O que dizem os nossos clientes", "ai_hint": "Título da prova social" },
                    { "key": "reviews", "label": "Lista de Testemunhos", "field_type": "card_list", "required": true, "placeholder": "Citações com nome do cliente, cargo e feedback", "ai_hint": "Comentários positivos de clientes anteriores" }
                  ]
                },
                {
                  "id": "faq_accordion",
                  "type": "faq",
                  "label": "Perguntas Frequentes (FAQ)",
                  "purpose": "Antecipar e quebrar as principais objeções de compra.",
                  "required": false,
                  "editable_fields": [
                    { "key": "section_title", "label": "Título do FAQ", "field_type": "text", "required": true, "placeholder": "Dúvidas Frequentes", "ai_hint": "Título da secção de dúvidas" },
                    { "key": "faq_items", "label": "Lista de Perguntas e Respostas", "field_type": "faq_list", "required": true, "placeholder": "Conjunto de perguntas comuns com respostas esclarecedoras", "ai_hint": "Respostas a dúvidas sobre prazos, custos e garantias" }
                  ]
                },
                {
                  "id": "contact_conversion",
                  "type": "contact",
                  "label": "Formulário de Contacto e Conversão",
                  "purpose": "Capturar o contacto direto do lead qualificado.",
                  "required": true,
                  "editable_fields": [
                    { "key": "form_title", "label": "Título do Formulário", "field_type": "text", "required": true, "placeholder": "Pronto para dar o próximo passo?", "ai_hint": "Chamada final para ação" },
                    { "key": "form_subtitle", "label": "Subtítulo do Formulário", "field_type": "textarea", "required": false, "placeholder": "Preencha os dados e a nossa equipa entrará em contacto em menos de 24 horas.", "ai_hint": "Garantia de resposta rápida" },
                    { "key": "submit_label", "label": "Texto do Botão de Envio", "field_type": "cta", "required": true, "placeholder": "Enviar Pedido", "ai_hint": "Ação de submissão" }
                  ]
                },
                {
                  "id": "footer_bottom",
                  "type": "footer",
                  "label": "Rodapé da Página",
                  "purpose": "Apresentar informações legais, morada e direitos reservados.",
                  "required": true,
                  "editable_fields": [
                    { "key": "copyright", "label": "Texto de Direitos Reservados", "field_type": "text", "required": true, "placeholder": "© 2026 Blue Bolt Studio. Todos os direitos reservados.", "ai_hint": "Informação legal de rodapé" },
                    { "key": "contact_info", "label": "Dados de Contacto Rápidos", "field_type": "text", "required": false, "placeholder": "contacto@agencia.pt • +351 210 000 000", "ai_hint": "Telefone e email institucionais" }
                  ]
                }
              ]
            }'::jsonb
        );

        -- Insert initial version 1 for seed template
        INSERT INTO public.template_versions (
            template_id,
            version,
            schema,
            change_note
        )
        SELECT id, 1, schema, 'Versão inicial do template padrão de serviços profissionais.'
        FROM public.templates
        WHERE slug = 'servicos-profissionais'
        ON CONFLICT (template_id, version) DO NOTHING;
    END IF;

    RAISE NOTICE 'Migração de templates e fontes de conteúdo aplicada com sucesso!';
END $$;
