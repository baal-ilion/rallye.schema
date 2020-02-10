import { Component, OnInit } from '@angular/core';
import { UserService } from '../user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  mode = 'List';
  curentUser;
  users;

  constructor(private userService: UserService, private router: Router) {
  }

  ngOnInit() {
    this.loadUsers();
  }

  onDeleteUser(user) {
    const r = confirm('Etes vous sûre ?');
    if (!r) {
      return;
    }
    const url = user._links.self.href;
    this.userService.deleteRessource(url).subscribe(data => {
      this.curentUser = undefined;
      this.mode = 'List';
      this.loadUsers();
    }, err => {
      console.log(err);
    });
  }

  onNewUser() {
    this.mode = 'new-user';
  }

  onSaveUser(value) {
/*     this.userService.addUser(value).subscribe(data => {
      this.mode = 'List';
      this.curentUser = undefined;
      this.loadUsers();
    }, err => {
      console.log(err);
    });
 */  }

  onEditUser(user) {
    this.userService.getRessource(user._links.self.href).subscribe(data => {
      this.curentUser = data;
      this.mode = 'edit-user';
    }, err => {
      console.log(err);
    });
  }

  onUpdateUser(value) {
    if (this.curentUser) {
      this.userService.patchRessource(this.curentUser._links.self.href, value).subscribe(data => {
        this.mode = 'List';
        this.curentUser = undefined;
        this.loadUsers();
      }, err => {
        console.log(err);
      });
    }
  }

  private loadUsers() {
    this.userService.getAllUsers().subscribe(data => {
      this.users = data;
    }, err => {
      console.log(err);
    });
  }
}
