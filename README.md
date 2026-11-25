# DermOS — prontuário dermatológico digital

Aplicação web privada para gestão do consultório dermatológico. A interface usa React, TypeScript e Vite; o ambiente público é o projeto Cloudflare Pages `dermos`, conectado ao repositório GitHub `Juliaassis238/dermos`, branch `main`.

## Backend, acesso e dados

O ambiente clínico usa Supabase Auth, PostgreSQL e Storage com Row Level Security (RLS). A chave publicável pode estar no navegador; chaves `service_role` e outras credenciais administrativas nunca devem ser incluídas no frontend ou no repositório.

O perfil inicial autorizado é `owner` para Mariana Gil. Os papéis clínicos têm acesso clínico conforme as policies. O papel `reception` usa somente views administrativas de contatos e agenda, além de RPCs limitadas para cadastrar/editar contato, arquivar paciente e gerenciar agendamentos. A secretária não recebe leitura direta das tabelas clínicas, das notas da agenda ou do bucket de arquivos. Não há conta de recepção ativa provisionada neste momento; uma usuária Auth separada e o respectivo perfil `reception` precisam ser criados antes do primeiro login dela.

A ação “excluir paciente” é uma inativação (`active = false`) para retirar o cadastro da lista ativa e preservar prontuário, consultas e arquivos vinculados. Não há exclusão física de histórico clínico por essa ação.

## Arquivos clínicos

O bucket `clinical-files` é privado. O Supabase limita uploads a 20 MiB por arquivo e aos MIME types PDF, JPEG e PNG. A galeria de fotos e a área de exames usam URLs assinadas temporárias para exibir arquivos a perfis clínicos autorizados. O modo de teste não acessa o Storage.

## Modo de teste

O modo de teste mantém cadastros somente no estado local do app. Os cadastros não são enviados ao Supabase, permanecem durante a navegação interna e desaparecem ao sair ou recarregar a lista. A exclusão de um paciente de teste remove apenas o item da sessão. Evoluções, agenda clínica, imagens, exames, lesões e prescrições não são gravados no Supabase nesse modo.

## Build e publicação

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm test
corepack pnpm build:static
```

O build gera `dist/public`. O projeto Cloudflare Pages publica a branch `main` com `pnpm build:static`. O workflow de GitHub Actions executa validações; ele não publica uma segunda cópia no GitHub Pages.

## Estado e limites conhecidos

Cadastro, edição e inativação de pacientes, modo de teste com remoção local, controle de acesso por papel, views/RPCs de recepção e validação de anexos têm implementação. Os testes locais não substituem login real nem verificação ponta a ponta com contas clínicas e de recepção.

Mensagens e financeiro continuam como demonstrações locais e não persistem no Supabase. Configurações ainda não têm ações funcionais. Acesso da secretária exige criar a conta Auth e atribuir o perfil `reception`; esse fluxo não é oferecido na tela de login. Backups/restauração, política de retenção, proteção contra senhas comprometidas, revisão dos avisos do Supabase e requisitos operacionais/profissionais precisam ser avaliados antes de uso clínico real. Use apenas dados fictícios no modo de teste.
