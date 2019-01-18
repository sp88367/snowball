use crate::entities::{Player, Snowball};
use crate::game::GameEvent;
use std::collections::HashMap;
use std::net::TcpStream;
use std::sync::mpsc::Sender;
use tungstenite as ts;

#[derive(Debug)]
pub struct Lobby {
    pub clients: HashMap<String, Client>,
    pub snowballs: HashMap<i32, Snowball>,
    pub game_thread_channel: Option<Sender<GameEvent>>,
}

pub struct Client {
    pub websocket: ts::WebSocket<TcpStream>,
    pub player: Player,
}

impl Lobby {
    pub fn new() -> Self {
        Lobby {
            clients: HashMap::new(),
            snowballs: HashMap::new(),
            game_thread_channel: None,
        }
    }

    pub fn send_to_others(&mut self, username: &str, message: &str) {
        let message = ts::Message::Text(message.to_string());
        for (client_name, client) in &mut self.clients {
            if client_name != username {
                client.websocket.write_message(message.clone()).unwrap();
            }
        }
    }
}

impl std::fmt::Debug for Client {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        f.debug_struct("Client").field("player", &self.player).finish()
    }
}

