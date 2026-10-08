# Nogueira PDV 🧾

Sistema de Ponto de Venda (PDV) e gestão comercial desenvolvido para pequenos e médios estabelecimentos.

## ✨ Sobre o projeto

O Nogueira PDV foi criado com foco em uma operação comercial simples, organizada e moderna, reunindo recursos de vendas, caixas, clientes, produtos e acompanhamento administrativo em uma única aplicação web.

## 🚀 Funcionalidades

- 🛒 Registro de vendas e leitura de código de barras
- 💳 Múltiplas formas de pagamento
- 💰 Gerenciamento de caixas e sessões
- 📦 Cadastro e gerenciamento de produtos
- 👥 Cadastro de clientes e funcionários
- 📊 Histórico de vendas
- 🧾 Histórico de fechamentos de caixa
- 🏢 Gerenciamento de estabelecimentos e filiais
- ⚙️ Configurações fiscais para NFC-e
- 🔐 Autenticação e controle de acesso

## 🛠️ Tecnologias

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- PostgreSQL
- React Router
- Lucide React

## 📁 Estrutura

```text
src/
├── components/
├── lib/
├── assets/
├── App.tsx
├── App.css
├── index.css
└── main.tsx
```

## ▶️ Como executar

### Pré-requisitos

- Node.js
- npm
- Um projeto Supabase configurado

### Instalação

```bash
npm install
```

Crie um arquivo `.env` a partir de `.env.example` e preencha as variáveis do seu ambiente Supabase:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Depois execute:

```bash
npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
```

## 🔒 Segurança

Credenciais e arquivos `.env` não fazem parte deste repositório. Use `.env.example` apenas como modelo e mantenha chaves e dados sensíveis fora do controle de versão.

## 📌 Status

Projeto em evolução, com novas funcionalidades e melhorias sendo desenvolvidas.

## 👨‍💻 Autor

**Danilo Nogueira**

Desenvolvedor de Sistemas Júnior | Python • React • PostgreSQL • Automação • IA

