# DermOS — prontuário dermatológico digital

Este repositório contém um protótipo visual e navegável do DermOS, um sistema privado de gestão e prontuário para dermatologia. A interface usa exclusivamente dados fictícios e demonstra dashboard, pacientes, prontuário, evolução fotográfica, mapa de lesões, prescrições, exames e agenda.

## Stack proposta

- **Frontend:** React + TypeScript + Vite.
- **Código:** GitHub privado.
- **Publicação da interface:** Vercel ou outro host compatível com o build estático.
- **Backend:** Supabase Auth, PostgreSQL, Storage privado e Row Level Security.
- **Integrações futuras:** Clinovi, Memed, WhatsApp, assinatura digital e pagamentos, sempre condicionadas à API, contrato e requisitos de cada fornecedor.

GitHub e Vercel publicam o código e a interface. Eles não substituem o banco, o armazenamento privado, a auditoria, os backups ou as políticas de acesso; essa parte fica no Supabase e na operação do sistema.

## O que já existe no protótipo

A barra lateral permite navegar pelos módulos. As ações principais são clicáveis e usam dados demonstrativos: abrir paciente, revisar prontuário, visualizar fotos comparativas, registrar lesões, preparar prescrição, consultar exames e abrir agenda.

## Como conectar o Supabase depois da aprovação

1. Criar um projeto Supabase em uma conta da contratante.
2. Executar `supabase/schema.sql` depois de revisar o modelo e as políticas RLS.
3. Criar o bucket privado de arquivos clínicos; fotos nunca devem ser públicas.
4. Configurar autenticação, perfis e MFA conforme o nível de risco.
5. Trocar os dados demonstrativos por queries protegidas e URLs assinadas para anexos.
6. Configurar backups, restauração testada, logs, alertas e retenção.
7. Publicar a interface no Vercel usando somente variáveis públicas do Supabase; chaves de serviço ficam exclusivamente no servidor/ambiente seguro.

## Aviso de segurança

Este é um protótipo de interface, não um sistema médico pronto para produção. Antes de inserir dados reais é necessário revisar a arquitetura, as políticas RLS, o armazenamento, os backups, a autenticação, os logs, os contratos e o tratamento de dados pessoais sensíveis. A emissão de receitas, inclusive controlados, e qualquer assinatura digital devem passar por validação profissional e requisitos aplicáveis antes de uso real.
