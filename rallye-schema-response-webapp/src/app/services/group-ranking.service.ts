import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GroupRankingEntry {
  groupId: string;
  groupName: string;
  team: number;
  teamName: string;
  groupScore: number;
  groupRank: number;
  present: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GroupRankingService {

  // IMPORTANT : on passe par le proxy /api
  private baseUrl = '/api/groupRankings';

  constructor(private http: HttpClient) { }

  getGroupRankings(): Observable<GroupRankingEntry[]> {
    // Ajoute un timestamp pour éviter tout cache éventuel côté navigateur ou proxy
    return this.http.get<GroupRankingEntry[]>(this.baseUrl, { params: { t: Date.now().toString() } });
  }
}
