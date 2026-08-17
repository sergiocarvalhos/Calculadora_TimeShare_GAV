# Calculadora Time Share GAV

## Visão Geral
Aplicação web para simulação e conversão de saldos pagos em propostas de Time Share da GAV Resorts. Desenvolvida para uso interno por consultores (atendimento telefônico/WhatsApp), com foco em conversão rápida e geração de propostas em PDF.

## Arquitetura Técnica
A aplicação foi construída com tecnologias modernas de frontend:
- **Framework:** React 19 + TypeScript
- **Roteamento e SSR:** TanStack Start / TanStack Router
- **Estilização:** Tailwind CSS + Lucide React (ícones)
- **Build Tool:** Vite
- **Persistência de Dados (Local-First):** `localStorage` (sem necessidade de banco de dados no momento).

## Pré-requisitos
- **Node.js** (versão 18 ou superior)
- **NPM** ou **Yarn**

## Como Rodar o Projeto

1. **Instalar Dependências**
   Abra o terminal na pasta do projeto e rode:
   ```bash
   npm install
   ```

2. **Rodar em Modo de Desenvolvimento**
   ```bash
   npm run dev
   ```
   A aplicação ficará disponível em `http://localhost:8080/`.

3. **Build para Produção**
   Para gerar os arquivos estáticos de produção:
   ```bash
   npm run build
   ```
   Os arquivos compilados estarão na pasta `dist/`.

## Estrutura de Autenticação e Permissões

O sistema possui uma autenticação simulada baseada no lado do cliente (`src/lib/consultant-auth.ts`), com três níveis de acesso:
1. **Administrador** (PIN: `0000`)
   - Acesso total
   - Pode alterar a configuração global (valor do ponto, mínimo de pontos, desconto, etc.) no painel `/admin`
2. **Supervisor** (PIN: `1234`)
   - Pode visualizar dados do painel `/admin` (modo leitura)
3. **Consultor** (PIN: `4321` ou `1111`)
   - Apenas usa a calculadora (`/`) e comparações (`/comparative`)

O painel administrativo (`/admin`) permite ajustar dinamicamente as tabelas de conversão. Esses dados são persistidos no `localStorage` sob a chave `timeshare:config`.

## Regras de Negócio Importantes
- **Mínimo de Pontos:** 6.400 pontos (configurável no admin).
- **Proposta Impressa:** Somente propostas elegíveis (≥ 6.400 pts) podem ser impressas.
- **Validação de Cliente:** A impressão só é liberada se o consultor informar o Nome e CPF do cliente (campos validados no frontend).
- **Desconto na Tabela:** Atualmente fixado em -20% (configurável).
- **Histórico:** As simulações recentes são armazenadas no navegador (chave `timeshare:history`).

## Sobre a Fase 3 (Integração)
Este código-fonte está pronto para ser integrado ao fluxo de demandas da TI da GAV. 
A arquitetura "Local-First" facilita o deploy em serviços de hospedagem estática (como Vercel, Netlify, Cloudflare Pages, AWS S3, etc).
Se futuramente houver a necessidade de sincronizar configurações entre vários computadores ou centralizar autenticação, a estrutura atual já separa a lógica nos arquivos `config-store.ts` e `consultant-auth.ts`, bastando substituir as chamadas de `localStorage` por chamadas à API da GAV.

## Manutenção
A configuração de versionamento (`CONFIG_VERSION`) no arquivo `src/lib/config-store.ts` força o reset automático do cache caso sejam enviadas atualizações estruturais críticas que invalidem as configurações antigas salvas nos navegadores dos consultores.
