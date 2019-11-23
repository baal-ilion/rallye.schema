import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StageService {
  constructor(private http: HttpClient) { }

  getStages(): Observable<any> {
    return this.http.get(environment.apiUrl + '/stageResults');
  }

  updateStage(stage): any {
    console.log(stage);
    this.http.patch(environment.apiUrl + '/stageResult', stage).subscribe(data => {
      console.log(data);
      return data;
    }, error => {
      console.log(error);
    });
  }
}
