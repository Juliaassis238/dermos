# DermOS — direções visuais do sistema de prontuário

## Contexto
Cinco conceitos de interface para um sistema privado de gestão e prontuário médico da Dra. Mariana Gil. O protótipo usa somente dados fictícios e serve para escolher a direção visual antes de conectar autenticação, banco, armazenamento e integrações.

## Conceitos
1. **Editorial** — marfim e terracota; acolhedor, sofisticado e legível.
2. **Botânica** — areia e sálvia; naturalidade com precisão.
3. **Melanina** — blush, âmbar e espresso; identidade e diversidade.
4. **Mineral** — azul clínico e branco; clareza, foco e sensação de segurança.
5. **Noite** — marrom profundo e champagne; discreto, premium e intimista.

## Escopo visual do protótipo
A tela inicial é um dashboard de consultório com menu lateral, perfil da médica, visão geral, métricas, agenda do dia, ficha rápida de paciente, acesso a prontuários recentes, rascunhos de evolução e status de segurança. O seletor superior alterna os cinco conceitos para comparação.

## Base técnica planejada
- React + TypeScript + Vite.
- Interface responsiva para desktop e celular.
- Dados demonstrativos sem informações reais de pacientes.
- Pontos de extensão para Supabase Auth, Database e Storage.
- Futura implementação: pacientes, prontuário estruturado e texto livre, fotografias privadas, permissões por perfil, auditoria e backups.
