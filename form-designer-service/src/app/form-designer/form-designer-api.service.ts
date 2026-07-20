import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DesignerStage } from './form-project.model';

export interface RallyParamDto {
  id: string;
  version?: number;
  name: string;
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
  stage: number;
  name: string;
  group?: unknown;
  groupId?: string;
  groupName?: string;
  questionPointParams?: Record<string, unknown>;
  performancePointParams?: Record<string, unknown>;
  questionParams?: Record<string, unknown>;
  _links?: unknown;
}

export interface FormDesignDto {
  id?: string;
  version?: number;
  stageParamId?: string;
  schemaVersion: number;
  content: DesignerStage;
  updatedAt?: string;
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

  saveFormDesign(stageId: string, design: FormDesignDto): Observable<FormDesignDto> {
    return this.http.put<FormDesignDto>(
      `${this.apiUrl}/formDesigns/stages/${encodeURIComponent(stageId)}`, design);
  }

  deleteFormDesign(stageId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/formDesigns/stages/${encodeURIComponent(stageId)}`);
  }
}
