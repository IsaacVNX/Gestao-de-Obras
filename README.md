# Sistema de Gestão de Obras 

Esta é uma aplicação web completa construída com Next.js, React, TypeScript, Tailwind CSS e Firebase, projetada para o gerenciamento integrado de obras, equipes, checklists de segurança e cadastros gerais de expedição.

## Funcionalidades Principais

O sistema oferece uma gama de funcionalidades robustas para otimizar a operação:

- **Dashboard de Visão Geral**: Apresenta estatísticas chave em tempo real, como o número de obras ativas, encarregados cadastrados e outras métricas relevantes.
- **Módulo de Obras**:
    - Criação e gerenciamento de obras, associando clientes, encarregados e equipes.
    - Listagem centralizada de todas as obras, com acesso rápido aos detalhes.
- **Ordens de Serviço (Checklists)**:
    - Criação de Ordens de Serviço detalhadas para cada obra.
    - Formulário completo para registrar informações do pedido, detalhes do serviço (andaimes), materiais utilizados e observações.
    - Edição de Ordens de Serviço com **histórico de versões completo**, permitindo a visualização de todas as alterações feitas ao longo do tempo.
- **Módulo de RH**:
    - Gerenciamento de usuários com diferentes níveis de permissão (Admin, Gestor, Escritório, Encarregado, Montador).
    - Cadastro, edição de função e desativação de usuários.
- **Módulo de Expedição (Cadastros)**:
    - **Clientes**: Gerenciamento completo de clientes (Pessoa Física e Jurídica), com opções de busca, filtro, paginação e exportação (PDF, Excel).
    - **Fornecedores**: Cadastro e gerenciamento de fornecedores.
    - **Produtos**: Gerenciamento de produtos com informações detalhadas, incluindo dados fiscais, dimensões e fotos.
    - **Transportadoras**: Cadastro e gerenciamento de transportadoras.
- **Autenticação Segura**: Sistema de login com Firebase Authentication, incluindo recuperação de senha.
- **Perfil de Usuário**: Cada usuário pode visualizar e atualizar suas informações pessoais.

## Tecnologias Utilizadas

- **Frontend**: Next.js, React, TypeScript
- **Estilização**: Tailwind CSS, ShadCN UI
- **Backend e Banco de Dados**: Firebase (Authentication, Firestore)
- **Geração de Relatórios**: `jspdf`, `jspdf-autotable`, `xlsx`
- **Validação de Formulários**: `react-hook-form`, `zod`

## Como Rodar o Projeto

1.  **Clone o repositório** para a sua máquina local.
2.  **Abra o terminal** na pasta raiz do projeto.
3.  **Instale as dependências** com o comando:
    ```bash
    npm install
    ```
4.  **Crie um arquivo `.env`** na raiz do projeto, se ainda não existir. As configurações do Firebase já estão no código, mas este arquivo pode ser usado para outras variáveis de ambiente no futuro.
5.  **Inicie o servidor de desenvolvimento** com o comando:
    ```bash
    npm run dev
    ```
6.  **Abra seu navegador** e acesse [http://localhost:3000](http://localhost:3000) para ver a aplicação rodando.

---

## Extensões Recomendadas para o VS Code

Para facilitar o desenvolvimento, recomendo instalar as seguintes extensões no seu Visual Studio Code. Elas fornecerão autocompletar, formatação de código e identificação de erros de forma mais eficiente.

- **ESLint** (`dbaeumer.vscode-eslint`): Ajuda a encontrar e corrigir problemas no código, garantindo um padrão de qualidade.
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`): Essencial para quem trabalha com Tailwind CSS. Oferece autocompletar para as classes e muito mais.
- **Prettier - Code formatter** (`esbenp.prettier-vscode`): Formata seu código automaticamente ao salvar, mantendo um estilo consistente.
- **Lucide Icons** (`vishaltun.lucide-preview`): Permite visualizar os ícones da biblioteca `lucide-react` diretamente no código.
- **GitLens — Git supercharged** (`eamodio.gitlens`): Ferramenta poderosa para visualizar o histórico de alterações de cada linha de código.

Para instalar, basta ir até a aba de **Extensões** (ícone de blocos no menu lateral do VS Code), pesquisar pelo nome ou ID e clicar em "Instalar".