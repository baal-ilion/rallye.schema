import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DesignerChallenge } from './form-project.model';

export interface RallyConfigurationDto {
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

export interface ChallengeConfigurationDto {
  id?: string;
  version?: number;
  challenge: number;
  name: string;
  group?: unknown;
  groupId?: string;
  groupName?: string;
  questionScorings?: Record<string, QuestionScoringDto>;
  performanceScorings?: Record<string, unknown>;
  questionDefinitions?: Record<string, QuestionDefinitionDto>;
  _links?: unknown;
}

export interface QuestionDefinitionDto {
  name: string;
  type?: 'QUESTION' | 'PERFORMANCE';
  managedByOrganizer?: boolean;
}

export interface QuestionScoringDto {
  name: string;
  point: number | null;
}

export interface FormDesignDto {
  id?: string;
  version?: number;
  challengeConfigurationId?: string;
  schemaVersion: number;
  content: DesignerChallenge;
  updatedAt?: string;
}

export interface GeneratedRecognitionPageDto {
  configuration: {
    challenge?: number;
    page?: number;
    template: string;
    questions: Record<string, unknown>;
  };
  imageBase64: string;
  imageMediaType: 'image/png';
  imageFileExtension: 'png';
}

interface ChallengeConfigurationCollectionDto {
  _embedded?: { challengeConfigurations?: ChallengeConfigurationDto[] };
}

@Injectable({ providedIn: 'root' })
export class FormDesignerApiService {
  private readonly apiUrl = '/api';

  constructor(private readonly http: HttpClient) {}

  getRally(): Observable<RallyConfigurationDto> {
    return this.http.get<RallyConfigurationDto>(`${this.apiUrl}/rally`);
  }

  saveRally(rally: RallyConfigurationDto): Observable<RallyConfigurationDto> {
    return this.http.put<RallyConfigurationDto>(`${this.apiUrl}/rally`, rally);
  }

  getChallenges(): Observable<ChallengeConfigurationCollectionDto> {
    return this.http.get<ChallengeConfigurationCollectionDto>(`${this.apiUrl}/challengeConfigurations`);
  }

  getChallenge(id: string): Observable<ChallengeConfigurationDto> {
    return this.http.get<ChallengeConfigurationDto>(`${this.apiUrl}/challengeConfigurations/${encodeURIComponent(id)}`);
  }

  challengeItems(collection: ChallengeConfigurationCollectionDto): ChallengeConfigurationDto[] {
    return collection._embedded?.challengeConfigurations || [];
  }

  createChallenge(challenge: ChallengeConfigurationDto): Observable<ChallengeConfigurationDto> {
    return this.http.post<ChallengeConfigurationDto>(`${this.apiUrl}/challengeConfigurations`, challenge);
  }

  updateChallenge(challenge: ChallengeConfigurationDto): Observable<ChallengeConfigurationDto> {
    return this.http.patch<ChallengeConfigurationDto>(`${this.apiUrl}/challengeConfigurations`, challenge);
  }

  deleteChallenge(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/challengeConfigurations/${encodeURIComponent(id)}`);
  }

  getFormDesigns(): Observable<FormDesignDto[]> {
    return this.http.get<FormDesignDto[]>(`${this.apiUrl}/formDesigns/challenges`);
  }

  getReferenceFormDesign(): Observable<FormDesignDto | null> {
    return this.http.get<FormDesignDto | null>(`${this.apiUrl}/formDesigns/reference`);
  }

  saveReferenceFormDesign(design: FormDesignDto): Observable<FormDesignDto> {
    return this.http.put<FormDesignDto>(`${this.apiUrl}/formDesigns/reference`, design);
  }

  saveFormDesign(challengeId: string, design: FormDesignDto): Observable<FormDesignDto> {
    return this.http.put<FormDesignDto>(
      `${this.apiUrl}/formDesigns/challenges/${encodeURIComponent(challengeId)}`, design);
  }

  deleteFormDesign(challengeId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/formDesigns/challenges/${encodeURIComponent(challengeId)}`);
  }

  publishRecognitionPages(challenge: number, pages: GeneratedRecognitionPageDto[]): Observable<unknown[]> {
    return this.http.put<unknown[]>(`${this.apiUrl}/formRecognitionConfigurations/generated/challenges/${challenge}`, { pages });
  }

  deleteRecognitionPages(challenge: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/formRecognitionConfigurations/generated/challenges/${challenge}`);
  }

  publishReferenceRecognition(page: GeneratedRecognitionPageDto): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/formRecognitionConfigurations/reference/generated`, page);
  }
}
