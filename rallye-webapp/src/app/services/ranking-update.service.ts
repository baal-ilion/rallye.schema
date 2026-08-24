import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RankingUpdateService {

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
      console.log('WebSocket connected');
      if (this.hasConnected) {
        this.updateSubject.next();
      }
      this.hasConnected = true;
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

  /**
   * Force a local refresh for listeners (used when an action already implies a ranking change).
   */
  triggerUpdate(): void {
    this.updateSubject.next();
  }
}
