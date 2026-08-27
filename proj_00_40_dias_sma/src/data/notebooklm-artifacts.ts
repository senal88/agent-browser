import type { DriveFileArtifact } from '../types/drive';

export interface NotebookLmDayArtifact {
  day: number;
  title: string;
  summary: string;
  reflection: string;
  prayerPoints: string[];
}

const ROSARY_DAYS: NotebookLmDayArtifact[] = [
  {
    day: 1,
    title: 'Dia 1 — Mistérios Gozosos (Anunciação)',
    summary: 'Meditação sobre a Anunciação do Anjo a Maria.',
    reflection:
      'Maria recebe a mensagem do Anjo Gabriel com humildade e confiança. O "fiat" de Maria abre o caminho da Encarnação.',
    prayerPoints: ['Humildade', 'Obediência', 'Confiança em Deus'],
  },
  {
    day: 2,
    title: 'Dia 2 — Mistérios Gozosos (Visitação)',
    summary: 'Meditação sobre a Visitação de Maria a Isabel.',
    reflection:
      'Maria vai depressa servir Isabel. A caridade prática e a alegria do Espírito Santo marcam este mistério.',
    prayerPoints: ['Caridade', 'Serviço', 'Alegria'],
  },
  {
    day: 3,
    title: 'Dia 3 — Mistérios Gozosos (Nascimento de Jesus)',
    summary: 'Meditação sobre o Nascimento do Senhor em Belém.',
    reflection:
      'Cristo nasce em pobreza para enriquecer a humanidade. Deus se faz pequeno para que possamos alcançá-Lo.',
    prayerPoints: ['Pobreza de espírito', 'Simplicidade', 'Adoração'],
  },
  {
    day: 4,
    title: 'Dia 4 — Mistérios Gozosos (Apresentação no Templo)',
    summary: 'Meditação sobre a Apresentação de Jesus no Templo.',
    reflection:
      'Simeão e Ana reconhecem o Messias. Maria e José oferecem o Filho ao Pai em obediência à Lei.',
    prayerPoints: ['Consagração', 'Espera fiel', 'Luz para as nações'],
  },
  {
    day: 5,
    title: 'Dia 5 — Mistérios Gozosos (Encontro no Templo)',
    summary: 'Meditação sobre o Encontro de Jesus no Templo.',
    reflection:
      'Jesus permanece no Templo entre os doutores. Maria guarda tudo no coração, modelo de contemplação.',
    prayerPoints: ['Escuta', 'Contemplação', 'Busca de Deus'],
  },
  {
    day: 6,
    title: 'Dia 6 — Mistérios Luminosos (Batismo no Jordão)',
    summary: 'Meditação sobre o Batismo de Jesus no Jordão.',
    reflection:
      'O Pai proclama: "Este é o meu Filho amado." Jesus inicia a missão pública abrindo os Céus.',
    prayerPoints: ['Identidade filial', 'Missão', 'Espírito Santo'],
  },
  {
    day: 7,
    title: 'Dia 7 — Mistérios Luminosos (Bodas de Caná)',
    summary: 'Meditação sobre as Bodas de Caná.',
    reflection:
      'Maria intercede: "Fazei tudo o que Ele vos disser." O primeiro milagre revela a glória de Cristo.',
    prayerPoints: ['Intercessão de Maria', 'Obediência a Cristo', 'Confiança'],
  },
  {
    day: 8,
    title: 'Dia 8 — Mistérios Luminosos (Anúncio do Reino)',
    summary: 'Meditação sobre o Anúncio do Reino e o chamado à conversão.',
    reflection:
      'Jesus proclama o Reino e convida ao arrependimento. A conversão abre o coração à graça.',
    prayerPoints: ['Conversão', 'Arrependimento', 'Evangelização'],
  },
  {
    day: 9,
    title: 'Dia 9 — Mistérios Luminosos (Transfiguração)',
    summary: 'Meditação sobre a Transfiguração do Senhor.',
    reflection:
      'Jesus revela Sua glória a Pedro, Tiago e João. A voz do Pai confirma: "Escutai-O."',
    prayerPoints: ['Escuta da Palavra', 'Esperança', 'Glória de Cristo'],
  },
  {
    day: 10,
    title: 'Dia 10 — Mistérios Luminosos (Instituição da Eucaristia)',
    summary: 'Meditação sobre a Instituição da Eucaristia.',
    reflection:
      'Na Última Ceia, Jesus se entrega sob as espécies de pão e vinho. Memorial do amor até o fim.',
    prayerPoints: ['Eucaristia', 'Entrega', 'Comunhão'],
  },
];

function buildMarkdown(day: NotebookLmDayArtifact): string {
  const points = day.prayerPoints.map((p) => `- ${p}`).join('\n');
  return `# ${day.title}

**Fonte:** NotebookLM — Santo Rosário 2026

## Resumo
${day.summary}

## Reflexão
${day.reflection}

## Intenções de oração
${points}

---
Gerado via proj_00_40_dias_sma
`;
}

function buildJson(day: NotebookLmDayArtifact): string {
  return JSON.stringify(
    {
      project: 'proj_00_40_dias_sma',
      source: 'NotebookLM — Santo Rosário 2026',
      day: day.day,
      title: day.title,
      summary: day.summary,
      reflection: day.reflection,
      prayerPoints: day.prayerPoints,
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

export function buildNotebookLmDriveArtifacts(): DriveFileArtifact[] {
  const artifacts: DriveFileArtifact[] = [];

  for (const day of ROSARY_DAYS) {
    artifacts.push({
      id: `day-${day.day}-md`,
      name: `Santo_Rosario_2026_Dia_${String(day.day).padStart(2, '0')}.md`,
      content: buildMarkdown(day),
      mimeType: 'text/markdown',
      description: `Santo Rosário 2026 — Dia ${day.day}: ${day.title}`,
      status: 'idle',
    });

    artifacts.push({
      id: `day-${day.day}-json`,
      name: `Santo_Rosario_2026_Dia_${String(day.day).padStart(2, '0')}.json`,
      content: buildJson(day),
      mimeType: 'application/json',
      description: `Metadados NotebookLM — Dia ${day.day}`,
      status: 'idle',
    });
  }

  return artifacts;
}

export { ROSARY_DAYS };
