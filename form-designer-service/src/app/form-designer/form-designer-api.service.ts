import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DesignerStage } from './form-project.model';

export interface RallyParamDto {
  id: string;
  version?: number;
  title: string;
  date: string;
  showLogo: boolean;
  logoUrl: string;
  titleSpacingBeforeMm: number;
  titleSpacingAfterMm: number;
  correctionCellWidthCm: number;
  correctionCellHeightCm: number;
  referenceFormDesignId?: string;
}

export interface StageParamDto {
  id?: string;
  version?: number;
  stage: number;
  name: string;
  group?: unknown;
  groupId?: string;
  groupName?: string;
  questionPointParams?: Record<string, QuestionPointParamDto>;
  performancePointParams?: Record<string, unknown>;
  questionParams?: Record<string, QuestionParamDto>;
  _links?: unknown;
}

export interface QuestionParamDto {
  name: string;
  type?: 'QUESTION' | 'PERFORMANCE';
  managedByOrganizer?: boolean;
}

export interface QuestionPointParamDto {
  name: string;
  point: number | null;
}

export interface FormDesignDto {
  id?: string;
  version?: number;
  stageParamId?: string;
  schemaVersion: number;
  content: DesignerStage;
  updatedAt?: string;
}

export interface GeneratedRecognitionPageDto {
  param: {
    stage?: number;
    page?: number;
    template: string;
    questions: Record<string, unknown>;
  };
  modelBase64: string;
  modelFileType: 'image/png';
  modelFileExtension: 'png';
}

interface StageParamCollectionDto {
  _embedded?: { stageParams?: StageParamDto[] };
}

@Injectable({ providedIn: 'root' })
export class FormDesignerApiService {
  private readonly apiUrl = '/api';

  constructor(private readonly http: HttpClient) {}

  getRally(): Observable<RallyParamDto> {
    return this.http.get<RallyParamDto>(`${this.apiUrl}/rally`);
  }

  saveRally(rally: RallyParamDto): Observable<RallyParamDto> {
    return this.http.put<RallyParamDto>(`${this.apiUrl}/rally`, rally);
  }

  getStages(): Observable<StageParamCollectionDto> {
    return this.http.get<StageParamCollectionDto>(`${this.apiUrl}/stageParams`);
  }

  getStage(id: string): Observable<StageParamDto> {
    return this.http.get<StageParamDto>(`${this.apiUrl}/stageParams/${encodeURIComponent(id)}`);
  }

  stageItems(collection: StageParamCollectionDto): StageParamDto[] {
    return collection._embedded?.stageParams || [];
  }

  createStage(stage: StageParamDto): Observable<StageParamDto> {
    return this.http.post<StageParamDto>(`${this.apiUrl}/stageParams`, stage);
  }

  updateStage(stage: StageParamDto): Observable<StageParamDto> {
    return this.http.patch<StageParamDto>(`${this.apiUrl}/stageParams`, stage);
  }

  deleteStage(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/stageParams/${encodeURIComponent(id)}`);
  }

  getFormDesigns(): Observable<FormDesignDto[]> {
    return this.http.get<FormDesignDto[]>(`${this.apiUrl}/formDesigns/stages`);
  }

  getReferenceFormDesign(): Observable<FormDesignDto | null> {
    return this.http.get<FormDesignDto | null>(`${this.apiUrl}/formDesigns/reference`);
  }

  saveReferenceFormDesign(design: FormDesignDto): Observable<FormDesignDto> {
    return this.http.put<FormDesignDto>(`${this.apiUrl}/formDesigns/reference`, design);
  }

  saveFormDesign(stageId: string, design: FormDesignDto): Observable<FormDesignDto> {
    return this.http.put<FormDesignDto>(
      `${this.apiUrl}/formDesigns/stages/${encodeURIComponent(stageId)}`, design);
  }

  deleteFormDesign(stageId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/formDesigns/stages/${encodeURIComponent(stageId)}`);
  }

  publishRecognitionPages(stage: number, pages: GeneratedRecognitionPageDto[]): Observable<unknown[]> {
    return this.http.put<unknown[]>(`${this.apiUrl}/responseFileParams/generated/stages/${stage}`, { pages });
  }

  deleteRecognitionPages(stage: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/responseFileParams/generated/stages/${stage}`);
  }

  publishReferenceRecognition(page: GeneratedRecognitionPageDto): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/responseFileParams/reference/generated`, page);
  }
}
