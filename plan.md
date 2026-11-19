# DermOS — prontuário dermatológico digital

## Objetivo
Criar um sistema privado para gestão do consultório e prontuário dermatológico da Dra. Mariana Gil. O protótipo usa dados fictícios e demonstra a arquitetura de navegação antes da conexão com Supabase.

## Módulos demonstrados
- Dashboard com métricas, agenda do dia, paciente recente, atividade e segurança.
- Pacientes com busca, status, última consulta e próximo retorno.
- Prontuário com resumo clínico, fototipo, alergias, medicações, evolução e linha do tempo.
- Fotos clínicas com comparação antes/depois e organização por região.
- Mapa corporal de lesões com topografia, morfologia, tamanho e status.
- Prescrição digital com rascunho, itens, posologia, histórico e etapa de assinatura.
- Exames e anexos com categorias, status e área de upload.
- Agenda com consultas e resumo mensal.

## Direção visual
A interface combina editorial médico, tons de pele, controles discretos, tipografia com serif de alto contraste e uma paleta acolhedora. O foco é reduzir carga cognitiva sem parecer um sistema hospitalar genérico.

## Arquitetura futura
GitHub privado mantém o código; Vercel publica o frontend; Supabase fornece Auth, PostgreSQL, Storage privado e RLS. O schema inicial está em `supabase/schema.sql`. Integrações com Clinovi, Memed, WhatsApp, pagamentos e assinatura dependem de APIs, contratos, consentimento e validação técnica.

## Limites
O protótipo não armazena dados reais, não emite receita válida, não assina documentos e não deve ser usado em produção clínica sem revisão de segurança, privacidade, operação e requisitos profissionais.
