export const isAccessDeniedError = (error) =>
    [401, 403].includes(Number(error?.code ?? error?.status ?? error?.statusCode ?? error?.response?.status));
