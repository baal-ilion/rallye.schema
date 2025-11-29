import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StageGroup } from '../param/models/stage-group';

@Injectable({
  providedIn: 'root'
})
export class StageGroupService {

  // URL RELATIVE, PAS DE http://localhost...
  private baseUrl = '/api/stageGroups';

  constructor(private http: HttpClient) { }

  getAll(): Observable<StageGroup[]> {
    return this.http.get<StageGroup[]>(this.baseUrl);
  }

  create(group: StageGroup): Observable<StageGroup> {
    return this.http.post<StageGroup>(this.baseUrl, group);
  }

  update(group: StageGroup): Observable<StageGroup> {
    return this.http.put<StageGroup>(`${this.baseUrl}/${group.id}`, group);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
