import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TeamUpdateService {

  private client: Client;
  private updateSubject = new Subject<void>();
  private hasConnected = false;

  updates$ = this.updateSubject.asObservable();

  constructor() {
    this.client = new Client({
      webSocketFactory: () => new SockJS('/ws-ranking'),
      reconnectDelay: 5000
    });

    this.client.onConnect = () => {
      if (this.hasConnected) {
        this.updateSubject.next();
      }
      this.hasConnected = true;
      this.client.subscribe('/topic/teamUpdate', () => {
        this.updateSubject.next();
      });
    };

    this.client.onStompError = (frame) => {
      console.error('STOMP error (team update)', frame.headers['message']);
    };

    this.client.activate();
  }

  triggerUpdate(): void {
    this.updateSubject.next();
  }
}
