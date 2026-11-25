# DermOS — entregas e validações

## Cadastro e remoção de pacientes
- [x] “Eu quero a opção de adicionar clientes e tbm de excluir eles de forma funcional” — cadastrar com nome obrigatório, gravar pacientes ativos no Supabase e inativar com confirmação, preservando o prontuário e os registros vinculados em vez de apagá-los fisicamente.
- [x] “Na versão teste quero poder excluir tbm.” — manter cadastro de teste apenas no estado local da sessão e permitir removê-lo sem alterar o Supabase.
- [x] “verifique no supabase se tá tudo certo” — confirmou projeto DermOS ativo, perfil owner de Mariana confirmado/ativo, RLS e policies clínicas, Storage privado, grants das funções, views/RPCs administrativas e limite de anexos; manter os alertas operacionais listados abaixo.

## Acesso da secretária
- [x] “Acesso pra secretaria: Próprio pra ela. Ela teria acesso a tudo menos ao prontuário dos pacientes” — preparar e aplicar o papel `reception`, views/RPCs administrativas, telas de cadastro/agenda sem notas e bloqueio dos módulos clínicos; o banco não concede leitura direta das tabelas clínicas ou do Storage a esse papel.
- [ ] Criar uma conta Supabase Auth própria para a secretária e atribuir um perfil `reception` ativo. A conta ainda não existe; é necessário o e-mail da secretária e provisionamento administrativo fora da tela de login.
- [ ] Testar ponta a ponta com essa conta: login, contatos, cadastro/edição/arquivamento, agenda e negação efetiva de leitura de prontuários, notas clínicas, lesões, prescrições, anexos e Storage.

## Imagens, exames e anexos
- [x] “Dando pra adicionar imagens se desejar nos prontuários etc” — implementar upload privado de fotos/exames, exibição de fotos e lista de exames com URLs assinadas; bucket limitado no servidor a 20 MiB e JPEG/PNG/PDF.
- [ ] Testar upload e leitura reais com sessão clínica autorizada e verificar comportamento de falha entre upload e gravação dos metadados.

## Autenticação e publicação
- [x] Corrigir permissões `EXECUTE` dos helpers RLS e retirar a autoelevação de perfil; perfil owner de Mariana foi provisionado após confirmação explícita.
- [x] Corrigir Site URL e Redirect URL do Supabase para `https://dermos.pages.dev`; a configuração foi recarregada e conferida, mas um novo link de confirmação ainda não foi testado ponta a ponta.
- [ ] Validar login real da proprietária, link de confirmação/recuperação e sessão expirada. Não solicitar nem armazenar senha no chat.
- [ ] Publicar a revisão do código no Cloudflare Pages e conferir o site live. Cloudflare está ligado ao repositório e publica automaticamente a branch `main`; o workflow de GitHub Actions foi convertido para apenas validar e não publicar outra cópia.

## Módulos e prontidão de produção
- [ ] “Deixe essa sistema 100% funcional” — auditar e conectar os módulos além de cadastro/agenda/anexos. Mensagens e financeiro são apenas locais e não persistem; Configurações não executa ações.
- [ ] Revisar backups/restauração, retenção, auditoria operacional e requisitos profissionais aplicáveis antes de qualquer uso com dados clínicos reais.
- [ ] Revisar avisos do Supabase: proteção contra senhas comprometidas desativada, 15 FKs sem índice de cobertura, 2 avisos `auth_rls_initplan`, 5 índices não usados e 35 combinações redundantes de policies permissivas. Aplicar mudanças somente após revisão de impacto.
