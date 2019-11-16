import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StageService {

  public host = 'http://192.168.3.50:8080';

  constructor(private http: HttpClient) { }

  getStages(): Observable<any> {
    return this.http.get(this.host + '/stageResults');
  }

  updateStage(stage): any {
    console.log(stage);
    this.http.patch(this.host + '/stageResult', stage).subscribe(data => {
      console.log(data);
      return data;
    }, error => {
      console.log(error);
    });
  }
}
