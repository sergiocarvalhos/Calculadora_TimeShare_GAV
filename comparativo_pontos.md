# Relatório Técnico: Tabela de Pontos e Diárias

Este documento detalha o comportamento do sistema de pontuação e apresenta a tabela de pontos atual comparada com a nova tabela após aplicação de 20% de desconto.

**Atenção: Todos os valores da tabela abaixo se referem estritamente a DIÁRIAS (1 noite).**

## Entendendo a Matemática do Sistema

**Como sabemos que o sistema trata isso como "Diária" (Lado Técnico do Código):**
No código-fonte da calculadora (especificamente no arquivo `index.tsx`), a matemática programada para mostrar o resultado na tela é exatamente esta: 
**`Número de Noites = Pontos Comprados ÷ Custo da Tabela`**

Como o sistema divide o saldo total e o resultado exibido na tela é em "Noites", a pontuação cadastrada na tabela representa matematicamente o custo de **1 única diária/noite**.

O que o sistema faz hoje é cruzar o **Preço que o cliente quer pagar** com o **Valor do Ponto** (que hoje está configurado em R$ 0,17) para descobrir quantos pontos ele comprou, e depois divide pelo custo dessa diária.

---

## Comparativo: Redução de 20% na Tabela de Pontos

Abaixo está o detalhamento de como a tabela de pontos ficará após a aplicação do desconto de 20% (-20%). 
*(Nota: A tarifa balcão em R$ não foi alterada, apenas a pontuação exigida por diária).*

**Regra Geral do Sistema**
- **Mínimo de Pontos para Simulação:** de `8.000` para **`6.400`** pontos.

### Park GAV Resort
| Unidade | Temporada | Pontos Atuais | Novo Valor (-20%) |
| :--- | :--- | :--- | :--- |
| **1 Quarto (1Q)** | Baixa | 2.800 | **2.240** |
| | Média | 3.000 | **2.400** |
| | Alta | 6.300 | **5.040** |
| | Altíssima | 6.500 | **5.200** |
| **2 Quartos (2Q)** | Baixa | 4.600 | **3.680** |
| | Média | 4.800 | **3.840** |
| | Alta | 8.900 | **7.120** |
| | Altíssima | 9.200 | **7.360** |

### Exclusive GAV Resort
| Unidade | Temporada | Pontos Atuais | Novo Valor (-20%) |
| :--- | :--- | :--- | :--- |
| **1 Quarto (1Q)** | Baixa | 2.600 | **2.080** |
| | Média | 2.800 | **2.240** |
| | Alta | 5.900 | **4.720** |
| | Altíssima | 6.000 | **4.800** |
| **2 Quartos (2Q)** | Baixa | 4.300 | **3.440** |
| | Média | 4.500 | **3.600** |
| | Alta | 8.000 | **6.400** |
| | Altíssima | 8.300 | **6.640** |

### Premium GAV Resort
| Unidade | Temporada | Pontos Atuais | Novo Valor (-20%) |
| :--- | :--- | :--- | :--- |
| **1 Quarto (1Q)** | Baixa | 2.500 | **2.000** |
| | Média | 2.600 | **2.080** |
| | Alta | 5.700 | **4.560** |
| | Altíssima | 5.900 | **4.720** |
| **2 Quartos (2Q)** | Baixa | 4.200 | **3.360** |
| | Média | 4.500 | **3.600** |
| | Alta | 9.000 | **7.200** |
| | Altíssima | 9.300 | **7.440** |

### Porto Alto Resort
| Unidade | Temporada | Pontos Atuais | Novo Valor (-20%) |
| :--- | :--- | :--- | :--- |
| **1 Quarto (1Q)** | Média | 6.300 | **5.040** |
| | Alta | 9.100 | **7.280** |
| | Altíssima | 13.600 | **10.880** |
| **2 Quartos (2Q)** | Média | 12.400 | **9.920** |
| | Alta | 18.000 | **14.400** |
| | Altíssima | 27.000 | **21.600** |

### Pyrenéus Residence
| Unidade | Temporada | Pontos Atuais | Novo Valor (-20%) |
| :--- | :--- | :--- | :--- |
| **1 Quarto (1Q)** | Baixa | 4.600 | **3.680** |
| | Média | 4.800 | **3.840** |
| | Alta | 7.300 | **5.840** |
| | Altíssima | 9.100 | **7.280** |
