"use client";

import React from "react";
import SuccessToast from "./SuccessToast";
import ErrorToast from "./ErrorToast";

interface ToastDetail {
  title?: string;
  message?: string;
  duration?: number;
}

export default function GlobalToasts() {
  const [success, setSuccess] = React.useState<{ isOpen: boolean; title: string; message?: string; duration?: number }>({
    isOpen: false,
    title: "",
    message: "",
    duration: 3000
  });
  const [error, setError] = React.useState<{ isOpen: boolean; title: string; message?: string; duration?: number }>({
    isOpen: false,
    title: "",
    message: "",
    duration: 4000
  });

  React.useEffect(() => {
    const onSuccess = (ev: Event) => {
      const detail = (ev as CustomEvent<ToastDetail>).detail || {};
      setSuccess({
        isOpen: true,
        title: detail.title || "操作成功",
        message: detail.message,
        duration: typeof detail.duration === "number" ? detail.duration : 3000
      });
    };
    const onError = (ev: Event) => {
      const detail = (ev as CustomEvent<ToastDetail>).detail || {};
      setError({
        isOpen: true,
        title: detail.title || "操作失败",
        message: detail.message,
        duration: typeof detail.duration === "number" ? detail.duration : 4000
      });
    };

    window.addEventListener("showSuccessToast", onSuccess as EventListener);
    window.addEventListener("showErrorToast", onError as EventListener);
    return () => {
      window.removeEventListener("showSuccessToast", onSuccess as EventListener);
      window.removeEventListener("showErrorToast", onError as EventListener);
    };
  }, []);

  return (
    <>
      <SuccessToast
        isOpen={success.isOpen}
        onClose={() => setSuccess(prev => ({ ...prev, isOpen: false }))}
        title={success.title}
        message={success.message}
        duration={success.duration}
      />
      <ErrorToast
        isOpen={error.isOpen}
        onClose={() => setError(prev => ({ ...prev, isOpen: false }))}
        title={error.title}
        message={error.message}
        duration={error.duration}
      />
    </>
  );
}


