export interface Chat {
  _id: string;
  participants: {
    user: {
      _id: string;
      fullName: string;
      userId: string;
      role: string;
    };
    role: string;
  }[];
  
  export interface Message {
    _id: string;
    sender: {
      _id: string;
      fullName: string;
      userId: string;
      role: string;
    };
    content: string;
    timestamp?: string;
    readAt?: string;
  }
