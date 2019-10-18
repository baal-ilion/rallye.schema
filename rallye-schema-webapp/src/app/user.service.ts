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

   getAllUsers() {
    return this.authenticationService.getResource(this.host + '/appUsers');
  }


  /*  addCategory(value) {
     return this.postRessource(this.host + '/categories', value);
   } */

  }
