import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChallengeGroup } from '../configuration/models/challenge-group';

@Injectable({
  providedIn: 'root'
})
export class ChallengeGroupService {

  // URL RELATIVE, PAS DE http://localhost...
  private baseUrl = '/api/challengeGroups';

  constructor(private http: HttpClient) { }

  getAll(): Observable<ChallengeGroup[]> {
    return this.http.get<ChallengeGroup[]>(this.baseUrl);
  }

  create(group: ChallengeGroup): Observable<ChallengeGroup> {
    return this.http.post<ChallengeGroup>(this.baseUrl, group);
  }

  update(group: ChallengeGroup): Observable<ChallengeGroup> {
    return this.http.put<ChallengeGroup>(`${this.baseUrl}/${group.id}`, group);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
