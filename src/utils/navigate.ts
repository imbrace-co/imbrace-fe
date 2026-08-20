let navigateTo: (path: string) => void;

export const setNavigator = (navFn: (path: string) => void) => {
  navigateTo = navFn;
};

export const navigate = (path: string) => {
  if (navigateTo) navigateTo(path);
};