# Manual Operacional — Calculadora de Conversão Time Share GAV

Este manual foi elaborado para orientar administradores, supervisores e consultores no uso do sistema **Calculadora de Conversão Time Share GAV**, com foco no gerenciamento do painel administrativo (`/admin`), cadastro de empreendimentos, unidades, tarifários e controle de acesso de usuários.

---

## 1. Níveis de Acesso e Permissões (Hierarquia)

O sistema possui três níveis de perfil de usuário. Cada perfil possui permissões específicas para garantir a segurança dos dados e o controle operacional:

| Funcionalidade / Permissão | Administrador | Supervisor | Consultor |
| :--- | :---: | :---: | :---: |
| **Acesso à Calculadora (`/`)** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Acesso ao Painel Admin (`/admin`)** | ✅ Sim | ✅ Sim | ❌ Acesso Restrito |
| **Visualizar Dashboard e Histórico** | ✅ Sim | ✅ Sim | ❌ Não |
| **Cadastrar Consultores** | ✅ Sim | ✅ Sim | ❌ Não |
| **Cadastrar Supervisores** | ✅ Sim | ❌ Não | ❌ Não |
| **Cadastrar Administradores** | ✅ Sim | ❌ Não | ❌ Não |
| **Ativar/Desativar Consultores** | ✅ Sim | ✅ Sim | ❌ Não |
| **Ativar/Desativar Supervisores** | ✅ Sim | ❌ Não | ❌ Não |
| **Excluir Propostas do Histórico** | ✅ Sim | ✅ Sim | ❌ Não |
| **Gerenciar Empreendimentos e Pontos** | ✅ Sim | ✅ Sim | ❌ Não |
| **Restaurar Padrões de Fábrica (Reset)** | ✅ Sim | ❌ Não | ❌ Não |

### Descrição dos Perfis:
- **Administrador:** Acesso total a todas as áreas, permissão para gerenciar a equipe completa (incluindo outros administradores) e editar parâmetros globais do tarifário.
- **Supervisor:** Focado na gestão da equipe de vendas local. Pode cadastrar e gerenciar a lista de Consultores, visualizar relatórios de propostas e acompanhar o desempenho da equipe.
- **Consultor:** Usuário operacional (vendedor/corretor). Utiliza a calculadora no dia a dia para realizar conversões de saldo de reaproveitamento em pontos e diárias para os clientes.

---

## 2. Acesso ao Painel Administrativo

1. Acesse o endereço da aplicação no navegador (ex: `http://localhost:8080` ou URL oficial).
2. No menu superior direito, clique no botão **Admin GAV** (ou acesse diretamente a rota `/admin`).
3. Digite a **Senha de Administrador** para autenticação.
   > **Nota de Segurança:** A sessão ativa dura até **8 horas**. Após esse período, o sistema solicitará novamente a senha para garantir que o painel não fique aberto em computadores compartilhados.

---

## 3. Estrutura do Painel Administrativo

Após fazer o login, o painel é dividido em **4 abas principais**:

1. **📊 Dashboard:** Visão geral de métricas, propostas aceitas, taxa de conversão e gráficos de linha de desempenho por consultor.
2. **📜 Histórico de Simulações:** Lista completa de propostas geradas pelos consultores com filtros por status e consultor.
3. **👥 Gestão de Usuários (Allowlist):** Cadastro, pesquisa, filtro e alteração de status de Consultores, Supervisores e Administradores.
4. **⚙️ Parâmetros (Empreendimentos & Tarifário):** Gerenciamento dos resorts, unidades habitacionais (apartamentos), tabela de pontos por diária e tarifas balcão em R$.

---

## 4. Módulo 1: Gestão de Usuários (Consultores e Equipe)

Para gerenciar quem tem autorização para utilizar o sistema, navegue até a aba **👥 Usuários** no Painel Admin.

### Passo a Passo: Cadastrar Novo Usuário
1. Na aba **Usuários**, clique no botão azul **"+ Novo Consultor"** (ou Usuário).
2. Preencha os campos obrigatórios no formulário:
   - **Nome:** Ex: `João`
   - **Sobrenome:** Ex: `Silva`
   - **E-mail:** Ex: `joao.silva@gavresorts.com.br` (deve ser um e-mail válido e único).
   - **PIN de Acesso:** Código numérico de **6 dígitos** (Ex: `112233`). Este é o PIN que o usuário utilizará para entrar na calculadora.
   - **Nível de Acesso (Perfil):** Selecione entre **Consultor**, **Supervisor** ou **Administrador** (opções disponíveis de acordo com a sua permissão).
3. Clique em **"Cadastrar Consultor"**.
4. O novo usuário aparecerá imediatamente na lista e já estará **Ativo** para realizar login na tela inicial.

### Como Ativar ou Desativar um Usuário
- Na tabela de usuários, identifique a coluna de status.
- Clique no botão de alternância (**Status: Ativo / Inativo**).
- Um usuário **Inativo** será bloqueado na tela de login da calculadora e não conseguirá realizar novas simulações até que seja reativado.

---

## 5. Módulo 2: Gerenciamento de Empreendimentos, Unidades e Tarifário

Na aba **⚙️ Parâmetros**, você controla as regras do negócio e o catálogo de resorts da GAV.

### 5.1 Parâmetros Globais
No topo da aba **Parâmetros**, você pode editar três regras chaves da conversão:
- **Custo do Ponto (R$):** Valor padrão de conversão (Ex: `0,17`).
- **Mínimo de Pontos:** Pontuação mínima exigida para elegibilidade da proposta (Ex: `6.400`).
- **Mínimo de Noites:** Mínimo de diárias permitidas por reserva no cálculo (Ex: `2`).
- Para aplicar alterações nestes 3 campos, clique no botão **"Salvar Parâmetros Globais"**.

### 5.2 Adicionar um Novo Empreendimento (Resort)
1. Clique no botão **"+ Adicionar Empreendimento"**.
2. Preencha:
   - **Nome do Resort:** Ex: `Gran Paradise GAV Resort`
   - **Slogan / Descrição Curta:** Ex: `Experiência tropical pé na areia`
3. Clique em **Salvar**. O novo resort será adicionado à lista.

### 5.3 Adicionar e Modificar Unidades (Apartamentos)
Dentro do card de cada Empreendimento, você pode gerenciar os tipos de quartos:

1. **Adicionar Nova Unidade:**
   - Clique em **"+ Adicionar Unidade"** dentro do card do resort desejado.
   - **Nome do Tipo:** Ex: `1 Quarto Super Luxo` ou `2 Quartos Family`.
   - **Tipo Curto (Sigla):** Ex: `1Q` ou `2Q`.
   - **Capacidade Máxima:** Número máximo de hóspedes permitidos (Ex: `5`).

2. **Editar Pontuação da Diária (Tabela de Pontos):**
   - Na tabela da unidade, localize a seção **"Pontos por Diária"**.
   - Digite a quantidade de pontos cobrada por **1 noite** em cada temporada:
     - **Baixa Temporada** (Ex: `2.240`)
     - **Média Temporada** (Ex: `2.400`)
     - **Alta Temporada** (Ex: `5.040`)
     - **Altíssima Temporada** (Ex: `5.200`)

3. **Editar Tarifa Balcão (R$ por Diária):**
   - Na mesma tabela, localize a seção **"Tarifa Balcão (R$)"**.
   - Insira o valor em Reais cobrado na diária balcão para 2 pessoas em cada temporada (Ex: Baixa: `R$ 476,00`).

4. **Salvar Alterações:**
   - As alterações nas unidades são salvas automaticamente na memória do sistema. Para garantir a sincronização com todos os componentes, clique no botão verde **"Salvar Alterações do Tarifário"**.

### 5.4 Restaurar Padrões de Fábrica (Reset)
Caso ocorra algum erro no cadastro do tarifário ou você deseje desfazer todas as edições manuais:
- Clique no botão vermelho **"Restaurar Padrões do Sistema"** no topo da aba Parâmetros.
- O sistema restaurará os resorts e pontos originais da GAV (já com o desconto de 20% aplicado).

---

## 6. Módulo 3: Métricas e Histórico de Propostas

### 6.1 Acompanhamento de Desempenho (Dashboard)
Na aba **📊 Dashboard**, o gestor pode acompanhar:
- **Total de Simulações:** Volume de propostas geradas no período.
- **Taxa de Conversão:** Porcentagem de propostas aceitas pelos clientes em relação ao total.
- **Gráfico de Linha:** Curva de desempenho ao longo do tempo, podendo filtrar por consultor específico ou visualizar o total geral da equipe.
- **Ranking de Consultores:** Tabela de produtividade listando os corretores que mais realizaram simulações com sucesso.

### 6.2 Histórico de Propostas
Na aba **📜 Histórico**:
- O supervisor/admin pode visualizar cada proposta gerada na calculadora.
- Filtre por status: **Aceita**, **Não Aceita**, **Pendente** ou **Inelegível**.
- Caso uma proposta tenha sido registrada por engano ou para testes, clique no ícone da **Lixeira** para excluí-la do histórico (função restrita a Supervisores e Administradores).

---

## 7. Resumo de Boas Práticas

1. **Mantenha os cadastros atualizados:** Sempre que um novo corretor entrar na equipe, cadastre-o com seu e-mail corporativo e passe o PIN inicial com orientação para manter a segurança.
2. **Desative consultores desligados:** Nunca exclua o histórico de vendas de um corretor que saiu; apenas mude seu status para **Inativo** para preservar os dados estatísticos da GAV.
3. **Conferência de Tarifário:** Ao alterar a pontuação de um resort, faça uma simulação de teste na calculadora (`/`) para conferir se o número de diárias calculadas corresponde à expectativa comercial.

---
*Manual elaborado para a equipe GAV Resorts — Versão 2.0 (Atualizado com desconto de 20% na pontuação).*
