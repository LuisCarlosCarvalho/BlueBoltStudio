-- ==============================================================================
-- Blue Bolt Page Studio - Phase 3 Extension
-- Migration: 005_template_industry_matching.sql
-- Adiciona segmentação por indústria aos templates e semeia template de Pet Shop.
-- ==============================================================================

DO $$
BEGIN
    -- 1. Adicionar colunas de segmentação à tabela de templates
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'templates' AND column_name = 'industry_tags'
    ) THEN
        ALTER TABLE public.templates ADD COLUMN industry_tags TEXT[] NOT NULL DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'templates' AND column_name = 'is_generic'
    ) THEN
        ALTER TABLE public.templates ADD COLUMN is_generic BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- 2. Criar índice GIN para pesquisas rápidas por tags de indústria
    CREATE INDEX IF NOT EXISTS idx_templates_industry_tags ON public.templates USING GIN (industry_tags);
    CREATE INDEX IF NOT EXISTS idx_templates_is_generic ON public.templates(is_generic);

    -- 3. Atualizar template padrão existente "Serviços Profissionais"
    UPDATE public.templates
    SET 
        industry_tags = ARRAY['professional_services', 'consulting'],
        is_generic = true
    WHERE slug = 'servicos-profissionais';

    -- 4. Inserir template de demonstração original: "Pet Shop e Bem-Estar Animal"
    IF NOT EXISTS (SELECT 1 FROM public.templates WHERE slug = 'pet-shop-bem-estar-animal') THEN
        INSERT INTO public.templates (
            name,
            slug,
            category,
            industry_tags,
            is_generic,
            description,
            preview_image_url,
            status,
            schema
        ) VALUES (
            'Pet Shop e Bem-Estar Animal',
            'pet-shop-bem-estar-animal',
            'Pet Shop',
            ARRAY['pet_shop'],
            false,
            'Template especializado de alta conversão para pet shops, cuidados veterinários, banho & tosa, hotel e nutrição animal.',
            'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=800&q=80',
            'active',
            '{
              "schema_version": "1.0.0",
              "template_name": "Pet Shop e Bem-Estar Animal",
              "category": "Pet Shop",
              "design_tokens": {
                "colors": {
                  "primary": "#0D5C75",
                  "accent": "#F59E0B",
                  "background": "#FFFDF9",
                  "text": "#1E293B"
                },
                "typography": {
                  "heading_font": "Outfit",
                  "body_font": "Inter"
                },
                "spacing": {
                  "section_padding": "py-20",
                  "container_max_width": "max-w-7xl"
                }
              },
              "sections": [
                {
                  "id": "hero_pet",
                  "type": "hero",
                  "label": "Hero & Apresentação Principal",
                  "purpose": "Apresentar a proposta de valor do pet shop e captar agendamentos com destaque imediato.",
                  "required": true,
                  "editable_fields": [
                    { "key": "headline", "label": "Título Principal (Headline)", "field_type": "text", "required": true, "placeholder": "O melhor cuidado, carinho e saúde para o seu melhor amigo", "ai_hint": "Título caloroso e focado no bem-estar do pet e tranquilidade do tutor" },
                    { "key": "subheadline", "label": "Subtítulo Persuasivo", "field_type": "textarea", "required": true, "placeholder": "Banho e tosa especializados, rações premium, farmácia e atendimento veterinário com profissionais apaixonados por animais.", "ai_hint": "Resumo dos serviços e diferencial de carinho e segurança" },
                    { "key": "cta_primary_label", "label": "Texto do Botão Principal", "field_type": "cta", "required": true, "placeholder": "Agendar Banho & Tosa", "ai_hint": "Ação principal direta" },
                    { "key": "badge_text", "label": "Etiqueta / Destaque Superior", "field_type": "text", "required": false, "placeholder": "🐾 Mais de 5.000 pets atendidos com amor", "ai_hint": "Prova social ou destaque rápido" }
                  ]
                },
                {
                  "id": "services_pet",
                  "type": "services",
                  "label": "Serviços Especializados",
                  "purpose": "Apresentar os principais serviços oferecidos (banho, tosa, veterinária, hotel, daycare).",
                  "required": true,
                  "editable_fields": [
                    { "key": "section_title", "label": "Título da Secção de Serviços", "field_type": "text", "required": true, "placeholder": "Tudo o que o seu pet precisa num só lugar", "ai_hint": "Título da secção de serviços" },
                    { "key": "section_subtitle", "label": "Subtítulo de Serviços", "field_type": "textarea", "required": false, "placeholder": "Serviços pensados para proporcionar conforto, higiene e saúde com total segurança.", "ai_hint": "Introdução aos serviços" },
                    { "key": "service_1_title", "label": "Serviço 1 - Nome", "field_type": "text", "required": true, "placeholder": "Banho & Tosa com Hidratação", "ai_hint": "Nome do serviço principal de estética" },
                    { "key": "service_1_desc", "label": "Serviço 1 - Descrição", "field_type": "textarea", "required": true, "placeholder": "Produtos dermatológicos de topo, toalhas higienizadas individualmente e profissionais calmos e pacientes.", "ai_hint": "Descrição detalhada do serviço 1" },
                    { "key": "service_2_title", "label": "Serviço 2 - Nome", "field_type": "text", "required": true, "placeholder": "Consultas & Medicina Preventiva", "ai_hint": "Nome do serviço veterinário" },
                    { "key": "service_2_desc", "label": "Serviço 2 - Descrição", "field_type": "textarea", "required": true, "placeholder": "Vacinação em dia, check-ups gerais e exames para garantir a longevidade e vitalidade do seu animal.", "ai_hint": "Descrição do serviço veterinário" },
                    { "key": "service_3_title", "label": "Serviço 3 - Nome", "field_type": "text", "required": true, "placeholder": "Hotel & Creche / Day Care", "ai_hint": "Nome do serviço de estadia ou creche" },
                    { "key": "service_3_desc", "label": "Serviço 3 - Descrição", "field_type": "textarea", "required": true, "placeholder": "Ambiente monitorizado, brincadeiras diárias e socialização segura enquanto trabalha ou viaja.", "ai_hint": "Descrição do serviço de estadia" }
                  ]
                },
                {
                  "id": "bath_grooming",
                  "type": "benefits",
                  "label": "Espaço Banho & Tosa Sem Stress",
                  "purpose": "Destacar o método humanizado de higiene animal e protocolos de segurança.",
                  "required": true,
                  "editable_fields": [
                    { "key": "grooming_headline", "label": "Título do Diferencial de Banho", "field_type": "text", "required": true, "placeholder": "Banho com Água Térmica e Sem Ansiedade", "ai_hint": "Foco em experiência tranquila para o pet" },
                    { "key": "grooming_description", "label": "Descrição dos Protocolos", "field_type": "textarea", "required": true, "placeholder": "Utilizamos técnicas de reforço positivo e equipamentos silenciosos para que cada sessão de estética seja relaxante e prazerosa.", "ai_hint": "Explicação dos cuidados no banho" },
                    { "key": "grooming_highlight", "label": "Destaque de Segurança", "field_type": "text", "required": false, "placeholder": "Vidro panorâmico para acompanhar todo o processo", "ai_hint": "Transparência para o tutor" }
                  ]
                },
                {
                  "id": "products_categories",
                  "type": "card_list",
                  "label": "Boutique & Farmácia Pet",
                  "purpose": "Exibir as categorias de produtos disponíveis (rações, brinquedos, medicamentos, snacks).",
                  "required": false,
                  "editable_fields": [
                    { "key": "boutique_title", "label": "Título da Boutique", "field_type": "text", "required": true, "placeholder": "Produtos Selecionados para Cães e Gatos", "ai_hint": "Título da secção de loja" },
                    { "key": "boutique_desc", "label": "Descrição da Loja", "field_type": "textarea", "required": false, "placeholder": "Marcas super premium, petiscos naturais e acessórios funcionais recomendados por veterinários.", "ai_hint": "Variedade de produtos" }
                  ]
                },
                {
                  "id": "differentials",
                  "type": "about",
                  "label": "Porquê Escolher o Nosso Pet Shop",
                  "purpose": "Apresentar a história, valores e paixão pelo cuidado dos animais.",
                  "required": true,
                  "editable_fields": [
                    { "key": "about_title", "label": "Título de Confiança", "field_type": "text", "required": true, "placeholder": "Tratamos o seu animal como parte da nossa família", "ai_hint": "Compromisso ético e afetivo" },
                    { "key": "about_text", "label": "História e Missão", "field_type": "textarea", "required": true, "placeholder": "Nascemos com a missão de criar um refúgio acolhedor onde a saúde e a alegria dos animais estão sempre em primeiro lugar.", "ai_hint": "Missão e equipa dedicada" }
                  ]
                },
                {
                  "id": "testimonials_pet",
                  "type": "testimonials",
                  "label": "Depoimentos de Tutores",
                  "purpose": "Apresentar provas sociais reais de donos de animais satisfeitos.",
                  "required": false,
                  "editable_fields": [
                    { "key": "testimonials_title", "label": "Título dos Testemunhos", "field_type": "text", "required": true, "placeholder": "O que dizem os tutores que confiam em nós", "ai_hint": "Título da prova social" }
                  ]
                },
                {
                  "id": "faq_pet",
                  "type": "faq",
                  "label": "Perguntas Frequentes",
                  "purpose": "Esclarecer dúvidas comuns sobre agendamentos, vacinas e cuidados.",
                  "required": false,
                  "editable_fields": [
                    { "key": "faq_title", "label": "Título do FAQ", "field_type": "text", "required": true, "placeholder": "Dúvidas Frequentes", "ai_hint": "Título das perguntas" }
                  ]
                },
                {
                  "id": "contact_location",
                  "type": "contact",
                  "label": "Localização, Horários & WhatsApp",
                  "purpose": "Facilitar o contacto direto e o agendamento rápido.",
                  "required": true,
                  "editable_fields": [
                    { "key": "contact_title", "label": "Título de Contacto", "field_type": "text", "required": true, "placeholder": "Venha visitar-nos ou agende pelo WhatsApp", "ai_hint": "Chamada para agendamento" },
                    { "key": "address_hint", "label": "Morada / Localização", "field_type": "text", "required": false, "placeholder": "Rua Exemplo, 123 - Lisboa", "ai_hint": "Localização física" },
                    { "key": "hours_text", "label": "Horário de Funcionamento", "field_type": "text", "required": false, "placeholder": "Segunda a Sábado das 09h às 19h", "ai_hint": "Horários" },
                    { "key": "whatsapp_cta", "label": "Texto do Botão WhatsApp", "field_type": "cta", "required": true, "placeholder": "Falar no WhatsApp", "ai_hint": "CTA de mensagem instantânea" }
                  ]
                },
                {
                  "id": "footer_pet",
                  "type": "footer",
                  "label": "Rodapé Institucional",
                  "purpose": "Informações legais, redes sociais e direitos reservados.",
                  "required": true,
                  "editable_fields": [
                    { "key": "copyright", "label": "Texto de Direitos", "field_type": "text", "required": true, "placeholder": "© 2026 Pet Shop & Bem-Estar Animal. Todos os direitos reservados.", "ai_hint": "Direitos de autor" }
                  ]
                }
              ]
            }'
        );
    END IF;
END $$;
