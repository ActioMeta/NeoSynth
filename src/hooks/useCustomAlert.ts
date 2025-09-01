import { useState } from 'react';
import { AlertButton } from '../components/CustomAlert';

export interface UseCustomAlertReturn {
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
  hideAlert: () => void;
  alertProps: {
    visible: boolean;
    title: string;
    message: string;
    buttons: AlertButton[];
    onClose: () => void;
  };
}

export const useCustomAlert = (): UseCustomAlertReturn => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState<AlertButton[]>([]);

  const showAlert = (
    alertTitle: string,
    alertMessage: string,
    alertButtons: AlertButton[] = [{ text: 'OK' }]
  ) => {
    setTitle(alertTitle);
    setMessage(alertMessage);
    setButtons(alertButtons);
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
  };

  return {
    showAlert,
    hideAlert,
    alertProps: {
      visible,
      title,
      message,
      buttons,
      onClose: hideAlert,
    },
  };
};
