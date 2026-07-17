import { Component } from '@angular/core';
import * as XLSX from 'xlsx';

interface DesignerQuestion {
  id: string;
  number: string;
  label: string;
  answer: string;
  difficulty: number;
  points: number;
}

interface DesignerSection {
  id: string;
  title: string;
  color: string;
  questions: DesignerQuestion[];
}

interface DesignerSectionFragment {
  section: DesignerSection;
  questions: DesignerQuestion[];
  continued: boolean;
}

interface DesignerPage {
  number: number;
  sections: DesignerSectionFragment[];
}

@Component({
  selector: 'app-form-designer',
  templateUrl: './form-designer.component.html',
  styleUrls: ['./form-designer.component.scss']
})
export class FormDesignerComponent {
  private static readonly RALLY_TITLE_STORAGE_KEY = 'rallye-schema.form-designer.rally-title';

  stage = 1;
  stageName = 'Nouvelle épreuve';
  rallyTitle = localStorage.getItem(FormDesignerComponent.RALLY_TITLE_STORAGE_KEY)
    || 'Le Rallye se prend aux jeux';
  correctedPreview = false;
  importError = '';
  fileName = '';
  sections: DesignerSection[] = [];
  pages: DesignerPage[] = [{ number: 1, sections: [] }];

  get questionCount(): number {
    return this.sections.reduce((total, section) => total + section.questions.length, 0);
  }

  get paginatedQuestionCount(): number {
    return this.pages.reduce((pageTotal, page) => pageTotal
      + page.sections.reduce((sectionTotal, fragment) => sectionTotal + fragment.questions.length, 0), 0);
  }

  get questionColumnWidth(): string {
    const maxLength = this.sections.reduce((length, section) => Math.max(length,
      ...section.questions.map(question => question.number.length)), 2);
    return `calc(${maxLength}ch + 5mm)`;
  }

  async importWorkbook(files: FileList | null): Promise<void> {
    const file = files?.item(0);
    if (!file) {
      return;
    }
    this.importError = '';
    try {
      const workbook = XLSX.read(await this.readFile(file), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: '' });
      const sections = this.parseSections(rows);

      if (!sections.some(section => section.questions.length)) {
        throw new Error('Aucune réponse trouvée à partir de la ligne 11.');
      }
      this.fileName = file.name;
      this.sections = sections;
      this.refreshPages();
    } catch (error) {
      this.importError = error instanceof Error ? error.message : 'Le fichier Excel ne peut pas être lu.';
    }
  }

  addSection(): void {
    const index = this.sections.length + 1;
    this.sections.push({
      id: `section-${Date.now()}`,
      title: `Section ${index}`,
      color: '#d9eaf2',
      questions: []
    });
    this.refreshPages();
  }

  removeSection(index: number): void {
    const [section] = this.sections.splice(index, 1);
    if (section?.questions.length) {
      if (!this.sections.length) {
        this.addSection();
      }
      this.sections[0].questions.push(...section.questions);
    }
    this.refreshPages();
  }

  print(corrected: boolean): void {
    this.correctedPreview = corrected;
    setTimeout(() => window.print());
  }

  updateRallyTitle(value: string): void {
    this.rallyTitle = value;
    localStorage.setItem(FormDesignerComponent.RALLY_TITLE_STORAGE_KEY, value);
  }

  trackSection(_: number, section: DesignerSection): string { return section.id; }
  trackQuestion(_: number, question: DesignerQuestion): string { return question.id; }

  private parseSections(rows: any[][]): DesignerSection[] {
    const hasSectionColumn = String(rows[8]?.[0] ?? '').trim().toLocaleLowerCase('fr') === 'section';
    if (!hasSectionColumn) {
      const questions = rows.slice(10)
        .filter(row => String(row[0] ?? '').trim() || String(row[2] ?? '').trim())
        .map((row, index) => this.toQuestion(row, index, 0));
      return [{ id: 'section-1', title: 'Questions', color: '#d9ead3', questions }];
    }

    const sections: DesignerSection[] = [];
    let current: DesignerSection | null = null;
    let questionIndex = 0;
    for (const row of rows.slice(10)) {
      const sectionName = String(row[0] ?? '').trim();
      const number = String(row[1] ?? '').trim();
      const answer = String(row[3] ?? '').trim();
      if (!sectionName && !number && !answer) {
        continue;
      }
      if (sectionName) {
        current = {
          id: `section-${sections.length + 1}`,
          title: sectionName,
          color: this.sectionColor(sectionName),
          questions: []
        };
        sections.push(current);
      }
      if (!current) {
        current = { id: 'section-1', title: 'Questions', color: '#d9ead3', questions: [] };
        sections.push(current);
      }
      current.questions.push(this.toQuestion(row, questionIndex++, 1, current.title));
    }
    return sections;
  }

  private toQuestion(row: any[], index: number, offset: number, sectionName = 'Question'): DesignerQuestion {
    const number = String(row[offset] ?? '').trim();
    const label = String(row[offset + 1] ?? '').trim();
    const technicalName = label || `${sectionName} ${number}`;
    return {
      id: this.technicalId(technicalName, index),
      number,
      label,
      answer: String(row[offset + 2] ?? '').trim(),
      difficulty: this.toNumber(row[offset + 3]),
      points: this.toNumber(row[offset + 4])
    };
  }

  private technicalId(value: string, index: number): string {
    const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase();
    return normalized || `Q${String(index + 1).padStart(3, '0')}`;
  }

  private sectionColor(name: string): string {
    const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (normalized.includes('vert')) { return '#b7d7a8'; }
    if (normalized.includes('bleu')) { return '#a9d6e5'; }
    if (normalized.includes('rouge')) { return '#f4a3a3'; }
    if (normalized.includes('jaune')) { return '#ffe98a'; }
    if (normalized.includes('gris')) { return '#d9d9d9'; }
    return '#d9ead3';
  }

  private toNumber(value: unknown): number {
    const normalized = String(value ?? '').replace(/\s/g, '').replace(',', '.');
    const numberValue = Number(normalized);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  private readFile(file: File): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error ?? new Error('Impossible de lire le fichier.'));
      reader.onabort = () => reject(new Error('Lecture du fichier annulée.'));
      reader.readAsArrayBuffer(file);
    });
  }

  private refreshPages(): void {
    const pages = this.paginate();
    const paginatedCount = pages.reduce((pageTotal, page) => pageTotal
      + page.sections.reduce((sectionTotal, fragment) => sectionTotal + fragment.questions.length, 0), 0);
    if (paginatedCount !== this.questionCount) {
      this.importError = `Pagination incomplète : ${paginatedCount} question(s) sur ${this.questionCount}.`;
      return;
    }
    this.pages = pages;
  }

  private paginate(): DesignerPage[] {
    // La hauteur des lignes est fixe en CSS. Cette capacité laisse la place au
    // cartouche, aux titres de section, au pied de page et aux quatre repères.
    // Toutes les mesures correspondent aux dimensions physiques du rendu A4.
    const contentCapacityMm = 190;
    const questionHeightMm = 4.7;
    const sectionOverheadMm = 14;
    const pages: DesignerPage[] = [];
    let current: DesignerPage = { number: 1, sections: [] };
    let remainingMm = contentCapacityMm;

    const pushPage = () => {
      pages.push(current);
      current = { number: pages.length + 1, sections: [] };
      remainingMm = contentCapacityMm;
    };

    for (const section of this.sections) {
      if (!section.questions.length) {
        continue;
      }
      let offset = 0;
      let continued = false;
      while (offset < section.questions.length) {
        // Une section consomme son titre, l'en-tête du tableau et sa marge.
        if (remainingMm < sectionOverheadMm + questionHeightMm) {
          pushPage();
        }
        const availableRows = Math.floor((remainingMm - sectionOverheadMm) / questionHeightMm);
        const questionCount = Math.min(availableRows, section.questions.length - offset);
        current.sections.push({
          section,
          questions: section.questions.slice(offset, offset + questionCount),
          continued
        });
        offset += questionCount;
        remainingMm -= sectionOverheadMm + questionCount * questionHeightMm;
        continued = true;
        if (offset < section.questions.length) {
          pushPage();
        }
      }
    }
    if (current.sections.length || !pages.length) {
      pages.push(current);
    }
    return pages;
  }
}
