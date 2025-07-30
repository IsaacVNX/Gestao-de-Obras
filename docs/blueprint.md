# Blueprint do Projeto: Gestão de Obras

Este documento serve como a "planta baixa" técnica e funcional do sistema Gestão de Obras. Ele detalha os recursos, as diretrizes de design, e a arquitetura do projeto.

---

## 1. Visão Geral e Objetivo

**Gestão de Obras** é um sistema de gestão de obras projetado para otimizar e centralizar as operações do Grupo Matos. A plataforma visa digitalizar e automatizar o gerenciamento de obras, equipes, checklists de segurança, ordens de serviço e logística de materiais, garantindo maior eficiência, segurança e rastreabilidade.

---

## 2. Módulos e Funcionalidades Principais

A aplicação é dividida nos seguintes módulos, cada um com suas funcionalidades específicas:

### 2.1. Core (Funcionalidades Centrais)
-   **Autenticação de Usuário**: Sistema de login seguro com Firebase Authentication.
-   **Níveis de Acesso por Função**:
    -   `admin`: Acesso total ao sistema.
    -   `gestor`: Acesso gerencial a todos os módulos operacionais.
    -   `escritorio`: Acesso a módulos de cadastro e expedição.
    -   `encarregado`: Acesso às obras e checklists que gerencia.
    -   `montador`: Acesso de visualização às obras em que está alocado.
-   **Dashboard de Início**: Painel com estatísticas e resumos rápidos da atividade no sistema.
-   **Gestão de Perfil**: Usuários podem visualizar e editar suas próprias informações pessoais.

### 2.2. Módulo de Obras
-   **Gestão de Obras**: Administradores e gestores podem criar novas obras, definindo cliente, nome da obra, encarregado e equipe de montadores.
-   **Visualização de Obras**:
    -   Administradores/Gestores/Escritório: Visualizam todas as obras.
    -   Encarregados e Montadores: Visualizam apenas as obras às quais foram atribuídos.
-   **Ordens de Serviço (Checklists)**:
    -   Criação de ordens de serviço detalhadas para cada andaime/estrutura em uma obra.
    -   Formulário completo com dados do cliente, serviço, equipamento, dimensões do andaime, prazos e lista de materiais.
    -   Edição de ordens de serviço existentes.
    -   **Histórico de Versões**: Cada salvamento de uma edição gera uma nova versão, criando um histórico completo de alterações que pode ser consultado.
    -   Exclusão de checklists (restrito a administradores).

### 2.3. Módulo de RH (Recursos Humanos)
-   **Gerenciamento de Usuários**:
    -   Visualização de todos os usuários com filtros por status (Ativo, Inativo).
    -   Criação de novos usuários com definição de dados pessoais, de acesso e função.
    -   Edição de função e status (ativar/desativar) dos usuários (restrito a admin/gestor).
    -   Visualização de detalhes de cada usuário.

### 2.4. Módulo de Expedição
-   **Cadastros Gerais**:
    -   **Clientes**: CRUD completo para gerenciamento de clientes.
    -   **Fornecedores**: *[Futuro]* CRUD para gestão de fornecedores.
    -   **Produtos**: *[Futuro]* CRUD para gestão de produtos de estoque.
    -   **Transportadoras**: *[Futuro]* CRUD para gestão de transportadoras.
-   **Controle de Estoque**:
    -   **Entradas**: *[Futuro]* Módulo para registrar a entrada de materiais e equipamentos no estoque.
    -   **Saídas**: *[Futuro]* Módulo para registrar a saída de materiais e equipamentos para as obras.

### 2.5. Módulos Futuros
-   **Módulo de Almoxarifado**: *[Futuro]* Gestão de inventário, controle de estoque de materiais, ferramentas e equipamentos.
-   **Módulo de Mapa**: *[Futuro]* Visualização geográfica das obras em um mapa interativo, mostrando localização e alocação de equipes.

---

## 3. Diretrizes de Estilo e UI/UX

-   **Paleta de Cores**:
    -   **Primária**: Azul profundo (`#3F51B5`) - Usado no sidebar e elementos principais.
    -   **Fundo**: Cinza claro (`#F0F2F5`) - Para o fundo das páginas.
    -   **Destaque (Accent)**: Laranja vivo (`#FF5722`) - Para botões de ação importantes e notificações.
-   **Tipografia**:
    -   **Fonte Principal**: 'Inter' ou 'Poppins' para corpo de texto e títulos.
-   **Layout**:
    -   Interface limpa, organizada, com uso de cartões para agrupar informações.
    -   Design responsivo, adaptando-se a desktops e dispositivos móveis.
    -   Uso de `Sidebar` expansível/colapsível para navegação.
-   **Componentes**:
    -   Baseado na biblioteca **ShadCN/UI** para consistência e qualidade visual.
    -   Ícones da biblioteca `lucide-react`.

---

## 4. Arquitetura e Tech Stack

-   **Framework**: Next.js com App Router.
-   **Linguagem**: TypeScript.
-   **Estilização**: Tailwind CSS.
-   **Componentes UI**: ShadCN/UI.
-   **Backend e Banco de Dados**: Firebase (Firestore, Authentication).
-   **Hospedagem**: Firebase App Hosting.
-   **Controle de Versão**: Git e GitHub.

---

## 5. Estrutura do Projeto (Pastas Principais)

```
/
├── src/
│   ├── app/                # Rotas e páginas do Next.js App Router
│   ├── components/         # Componentes React reutilizáveis (UI, Layouts)
│   ├── hooks/              # Hooks customizados (ex: useAuth, useUserManagement)
│   ├── lib/                # Funções utilitárias, config do Firebase, definições de navegação
│   ├── ai/                 # [Futuro] Lógica relacionada a IA com Genkit
├── docs/                   # Documentação do projeto (este arquivo)
├── .gitignore              # Arquivos ignorados pelo Git
├── next.config.ts          # Configurações do Next.js
├── package.json            # Dependências e scripts do projeto
├── tailwind.config.ts      # Configurações do Tailwind CSS
└── tsconfig.json           # Configurações do TypeScript
```
