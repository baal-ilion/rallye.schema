import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RankingUpdateService {

  private client: Client;
  private updateSubject = new Subject<void>();

  updates$ = this.updateSubject.asObservable();

  constructor() {
    this.client = new Client({
      webSocketFactory: () => new SockJS('/ws-ranking'),
      reconnectDelay: 5000
    });

    this.client.onConnect = () => {
      console.log('WebSocket connected');
      this.client.subscribe('/topic/rankingUpdate', () => {
        console.log('Mise à jour classement reçue');
        this.updateSubject.next();
      });
    };

    this.client.onStompError = (frame) => {
      console.error('STOMP error', frame.headers['message']);
    };

    this.client.activate();
  }
}
