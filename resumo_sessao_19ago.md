# Resumo da Sessão — 19 de Agosto de 2026

## 🔐 Sistema de Autenticação Completo

### 1. Login real no Painel Admin (`/admin`)
**Problema:** qualquer pessoa que acessasse `/admin` entrava automaticamente sem precisar digitar nada (havia um auto-login no código).

**Solução:** o painel agora exige **e-mail + PIN** válidos para entrar. Além disso:
- Usuários com perfil **Consultor** são barrados com mensagem específica: *"Acesso restrito. Seu perfil não tem permissão para o painel."*
- Credenciais erradas exibem: *"E-mail ou PIN incorretos."*
- Apenas **Administradores e Supervisores** conseguem acessar.

---

### 2. Edição de usuários por Administradores
**Novo botão ✏️ (lápis)** na tabela de Acessos Autorizados.

| Perfil | Pode editar |
|:---|:---|
| Administrador | Qualquer usuário, exceto a si mesmo |
| Supervisor | Apenas Consultores |
| Consultor | Ninguém |

O modal de edição permite alterar: nome, sobrenome, e-mail, cargo e status (ativo/inativo).

---

### 3. Reset de senha por Administradores
**Novo botão 🔑 (chave)** ao lado de cada usuário na tabela.

- Admin define um **PIN temporário** para o usuário.
- O sistema marca automaticamente o usuário com `mustChangePin: true`.
- Na próxima vez que o usuário entrar, será **forçado a criar uma nova senha pessoal**.

---

### 4. Troca obrigatória de senha no 1º acesso
Quando um **novo consultor é cadastrado** pelo Admin/Supervisor:
- Ele recebe um PIN temporário.
- No **primeiro login**, antes de acessar a calculadora, aparece a tela **"Crie sua Senha Pessoal"** com:
  - Campos Nova Senha e Confirmar Senha
  - 👁️ Olhinho para ver/ocultar cada campo
  - Indicador de coincidência em tempo real (verde ✅ / vermelho ❌)
  - Botão "Definir Minha Senha" só ativa quando as senhas coincidem

---

### 5. Consultor pode alterar a própria senha
**Novo botão "Alterar Senha"** no cabeçalho da calculadora (ao lado de Sair).

O modal solicita:
1. **Senha Atual** (valida antes de aceitar)
2. **Nova Senha** (mín. 6 caracteres alfanuméricos)
3. **Confirmar Nova Senha**

---

### 6. Padrão de PIN atualizado em todo o sistema
| Antes | Depois |
|:---|:---|
| Apenas números | Letras + números (alfanumérico) |
| Mínimo 4 dígitos | Mínimo **6 caracteres** |
| Máximo 6 dígitos | Máximo 20 caracteres |
| Caracteres especiais aceitos | Caracteres especiais **bloqueados** |

O filtro é aplicado em **todos os campos** de senha do sistema (login, cadastro, edição, reset, alteração).

---

### 7. Correção crítica de bug no Login
**Problema:** a tela de login `/login` tinha um filtro `replace(/\D/g, "")` que removia todas as letras enquanto o usuário digitava o PIN. Isso fazia com que qualquer senha com letras nunca funcionasse.

**Solução:** filtro corrigido para aceitar letras e números, `inputMode="numeric"` removido, `maxLength` atualizado para 20.

---

## 📁 Arquivos Modificados Hoje

| Arquivo | O que mudou |
|:---|:---|
| [`consultant-store.ts`](file:///c:/Users/Sergio/OneDrive/Documentos/Calculadora_TimeShare_GAV/src/lib/consultant-store.ts) | Campo `mustChangePin`, funções `isValidPin` e `resetUserPin` |
| [`admin.tsx`](file:///c:/Users/Sergio/OneDrive/Documentos/Calculadora_TimeShare_GAV/src/routes/admin.tsx) | Login real, modal de edição, botão reset de senha, coluna de ações |
| [`index.tsx`](file:///c:/Users/Sergio/OneDrive/Documentos/Calculadora_TimeShare_GAV/src/routes/index.tsx) | Tela de 1º acesso, modal "Alterar Senha", imports corrigidos |
| [`login.tsx`](file:///c:/Users/Sergio/OneDrive/Documentos/Calculadora_TimeShare_GAV/src/routes/login.tsx) | Filtro de PIN corrigido para alfanumérico |
| [`.gitignore`](file:///c:/Users/Sergio/OneDrive/Documentos/Calculadora_TimeShare_GAV/.gitignore) | Criado do zero (node_modules estava sendo rastreado) |

---

## 🔑 Credenciais para Teste

| Usuário | E-mail | PIN padrão |
|:---|:---|:---|
| Admin GAV | `admin@gavresorts.com.br` | `123456` |
| Mikaelly Rezende | *(conforme cadastrado)* | *(conforme cadastrado)* |
| Sergio Carvalho | *(conforme cadastrado)* | *(conforme cadastrado)* |

> [!NOTE]
> O PIN `123456` do Admin padrão **não** possui `mustChangePin: true` (usuários existentes não são afetados pela nova regra). Apenas novos usuários criados a partir de hoje serão obrigados a trocar na 1ª vez.
