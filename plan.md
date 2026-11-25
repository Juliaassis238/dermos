# DermOS — prontuário dermatológico digital

## Objetivo

Manter o DermOS como sistema privado para gestão do consultório e prontuário dermatológico. O sistema separa as rotinas administrativas de recepção dos dados clínicos e mantém um modo de teste sem persistência.

## Papéis e fronteiras de acesso

- `owner`, `doctor` e `assistant` são papéis clínicos, com acesso controlado por RLS às áreas clínicas.
- `reception` recebe login próprio e acessa dashboard, contatos e agenda administrativa. A view de contatos expõe apenas nome, nome preferido, telefone, e-mail, situação e data de criação. A view de agenda expõe paciente, horário, tipo genérico de atendimento e status; não expõe notas. RPCs limitadas operam o cadastro e agendamento.
- Recepção não lê as tabelas clínicas, evoluções, lesões, prescrições, metadados de anexos nem o Storage clínico. A navegação também bloqueia as telas de prontuário.
- A conta Auth e o perfil `reception` precisam ser criados separadamente antes de permitir o primeiro login da secretária. Não há provisionamento automático nem cadastro público.

## Comportamento dos cadastros

No ambiente clínico, a lista ativa e os campos clínicos são lidos e gravados em `public.patients`, mediante sessão e policies RLS. Nome completo é obrigatório e campos opcionais vazios são enviados como `NULL`.

A ação de exclusão retira o paciente da lista ativa com `active = false`; o prontuário, as consultas e os arquivos vinculados permanecem preservados. O modo de teste mantém cadastros em estado local, permite removê-los e não grava dados no Supabase.

## Anexos

Fotos clínicas e exames são armazenados em bucket privado do Supabase. O bucket aceita somente JPEG, PNG e PDF, com limite server-side de 20 MiB. A interface cria URLs assinadas temporárias para perfis clínicos autorizados. Falhas entre upload do objeto e gravação dos metadados ainda podem exigir conferência operacional do arquivo órfão.

## Arquitetura atual

- **Interface:** React, TypeScript e Vite em `client/`.
- **Navegação e autenticação:** `client/src/pages/Home.tsx` verifica sessão e papel ativo, filtra rotas por papel, mostra dashboard/agenda e protege os módulos clínicos.
- **Pacientes:** `client/src/components/Patients.tsx` implementa cadastro, edição e inativação para papéis clínicos; para recepção usa apenas view/RPC administrativa; para o modo de teste mantém estado local.
- **Acesso:** `client/src/lib/access.ts` mantém a matriz de rotas e `access.test.ts` cobre os bloqueios principais.
- **Backend:** Supabase Auth, PostgreSQL e Storage privado com chave publicável no cliente e políticas RLS. Credenciais `service_role` nunca entram no frontend.
- **Publicação:** projeto Cloudflare Pages `dermos`, conectado ao repositório GitHub na branch `main`, com build `pnpm build:static` e saída `dist/public`. O workflow de GitHub Actions valida código e não publica para GitHub Pages.

## Direção visual

Interface editorial médica em tons acolhedores, tipografia serifada para hierarquia e controles discretos. A confirmação de exclusão informa que o cadastro sai da lista ativa, mas o histórico clínico é preservado.

## Limites e pré-requisitos

A secretária ainda precisa de conta própria no Auth e perfil `reception`; sem isso, o login dela não pode ser testado. Mensagens e financeiro permanecem locais e não persistem; Configurações não tem ações. Não declarar o sistema 100% funcional nem pronto para uso clínico enquanto módulos, autenticação real, anexos, perfil da secretária, backups/restauração, retenção e requisitos operacionais não forem verificados ponta a ponta.
