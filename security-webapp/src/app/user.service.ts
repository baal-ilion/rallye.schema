import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  public host = 'http://localhost:8080';

  constructor(private http: HttpClient, private authenticationService: AuthenticationService) {
  }

  getRessource(url) {
    const httpHeaders = new HttpHeaders({ Authorization: this.authenticationService.jwt });
    return this.http.get(url, { headers: httpHeaders });
  }

  getAllUsers() {
    return this.getRessource(this.host + '/appUsers');
  }

  deleteRessource(url) {
    const httpHeaders = new HttpHeaders({ Authorization: this.authenticationService.jwt });
    return this.http.delete(url, { headers: httpHeaders });
  }

  /*  addCategory(value) {
     return this.postRessource(this.host + '/categories', value);
   } */

  postRessource(url, value) {
    const httpHeaders = new HttpHeaders({ Authorization: this.authenticationService.jwt });
    return this.http.post(url, value, { headers: httpHeaders });
  }

  patchRessource(url, value) {
    const httpHeaders = new HttpHeaders({ Authorization: this.authenticationService.jwt });
    return this.http.patch(url, value, { headers: httpHeaders });
  }
}
