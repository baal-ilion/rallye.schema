import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type PrizeType = 'GENERAL' | 'GROUP';

export interface PrizeAssignment {
  type: PrizeType;
  groupId: string | null;
  groupName: string | null;
  team: number;
  teamName: string;
  score: number;
  rank: number;
}

export interface PrizeDistributionResult {
  generalPrize: PrizeAssignment | null;
  groupPrizes: PrizeAssignment[];
}

@Injectable({
  providedIn: 'root'
})
export class PrizeDistributionService {

  // IMPORTANT : passe par le proxy /api
  private baseUrl = '/api/prizes';

  constructor(private http: HttpClient) { }

  getPrizes(): Observable<PrizeDistributionResult> {
    return this.http.get<PrizeDistributionResult>(this.baseUrl);
  }
}
