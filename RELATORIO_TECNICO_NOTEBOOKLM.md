# Relatório de Implementação e Arquitetura: Plataforma de Gestão de Engenharia & IA

## 1. Visão Geral do Projeto
A plataforma é um sistema inteligente para gestão e acompanhamento de obras (focada em elevadores comerciais e de passageiros). O principal diferencial do projeto é eliminar planilhas e processos manuais através da fusão de um **Dashboard Administrativo Web** (para gestores) e um **Bot do Telegram** (para apontamentos rápidos dos técnicos de campo). A plataforma conta com forte integração de **Inteligência Artificial Generativa (Google Gemini)** para analisar métricas operacionais, auditar gargalos e fornecer relatórios automatizados de produtividade.

## 2. Arquitetura Tecnológica
O sistema foi desenhado com foco em alta disponibilidade, baixo custo de manutenção e escalabilidade sem servidor (Serverless).

- **Frontend (Painel Administrativo):** Desenvolvido em **React + Vite**, utilizando PWA (Progressive Web App) para funcionar como aplicativo no celular dos gestores. O design foca em responsividade e interfaces "dark mode" modernas.
- **Backend & Banco de Dados:** **Supabase (PostgreSQL)**, operando como BaaS (Backend as a Service). Responsável pela autenticação, banco de dados relacional e Row-Level Security (RLS).
- **Serverless (Edge Functions):** Código em **TypeScript / Deno** hospedado nativamente no ecossistema Supabase. Usado para não expor lógicas sensíveis ou chaves de API no Frontend.
- **Motor de Inteligência Artificial:** **Google Gemini 2.5 Flash**, integrado via chamadas de API REST diretamente pelo backend, garantindo respostas ultrarrápidas (< 3 segundos) nas análises.

## 3. Fluxos e Módulos Implementados

### 3.1. Bot do Telegram (O "Aplicativo" do Técnico)
Para evitar atrito na adoção (necessidade de instalar apps pesados, exigir logins constantes em áreas sem internet), toda a comunicação com a equipe de campo é feita de forma fluída pelo Telegram.
- **Autenticação Segura:** O técnico interage com o bot informando o CPF. O Supabase verifica na tabela `profiles`, autenticando e vinculando seu `telegram_chat_id` para notificações futuras.
- **Interações via Menu (Inline Keyboards):** O comando `/atualizar` gera botões automáticos com as obras sob a responsabilidade do técnico.
- **Mídia e Evidências:** Técnicos podem anexar fotos de andamento das obras pelo celular, que são processadas pelo bot e salvas no **Supabase Storage**.
- **Processamento de Áudios (Áudio-para-Ação):** *[Destaque Tecnológico]* O técnico pode simplesmente mandar uma mensagem de voz explicando o andamento. O sistema encaminha o áudio para o Gemini, que faz o *speech-to-text*, interpreta o contexto da obra e extrai a porcentagem correta de evolução para atualizar o Banco de Dados.

### 3.2. Dashboard Web (Visão Executiva)
O Dashboard consolida os dados vindos do Telegram e de cadastros em um painel gerencial rico.
- **Acompanhamento Planejado vs. Realizado:** Gráficos interativos exibem, para cada obra, o progresso "Esperado" (com base em cronogramas estipulados) contrastado de forma visual com a "Realidade" (apontamentos do técnico).
- **Relatório de Eficiência por IA:** O Dashboard não apenas exibe dados, mas os interpreta. Ele agrega todas as "Fases Operacionais" de uma obra (ex: alinhamento do chassi, fiação elétrica) e calcula a média de dias gastos por etapa.
- **Auditoria Automatizada:** Esses dados consolidados são empacotados e enviados ao Gemini via Edge Function (rota `ai-analysis`). O modelo assume a persona de um *Auditor Sênior*, identificando instantaneamente onde o técnico ou a empresa perdem mais tempo, gerando uma nota de eficiência e sugerindo planos gerenciais e de treinamento.

### 3.3. Segurança, Custos e Gerenciamento de Chaves
- **Isolamento de Credenciais:** As chaves de API do Telegram (Bot Token) e do Gemini (API Key) não estão expostas no código público do Github nem no Frontend (React). 
- **Secret Vault:** As chaves residem com segurança dentro do cofre de segredos do servidor Supabase e são injetadas nas Edge Functions (backend) apenas no momento da execução. Isso neutraliza riscos de sequestro de cota e ataques de vazamento de dados.

## 4. Sugestões de Estrutura para sua Apresentação

Para transformar este documento em uma apresentação (slide deck), recomendo a seguinte sequência no NotebookLM ou PowerPoint:

1. **Slide 1 - O Problema:** Falta de comunicação em tempo real com técnicos de campo e planilhas defasadas.
2. **Slide 2 - A Solução (Visão Geral):** Uma ponte invisível entre o campo (Telegram) e o escritório (Dashboard React) usando Supabase.
3. **Slide 3 - Como o Técnico usa:** Mostre um print do celular com o Bot do Telegram e as opções do comando `/atualizar`.
4. **Slide 4 - Como o Gestor vê:** Coloque o print do Dashboard, evidenciando as barras duplas de progresso (Laranja = Esperado, Azul = Realizado).
5. **Slide 5 - O "Wow Factor" (Inteligência Artificial):** Coloque a print do Relatório de Eficiência da IA ("Gerar Análise"), explicando como ela cruza dezenas de fases de montagem para detectar gargalos ocultos.
6. **Slide 6 - Segurança e Viabilidade:** Mencione as Edge functions, o isolamento das APIs e os baixos custos de usar Gemini 2.5 Flash em arquitetura Serverless.
