export const CREATE_MESSAGES = {
  typeOfProject: "What type of project do you want to create?",
  projectName: "What is your project named?",
  framework: "What framework do you want to use?",
  language: "What language do you want to use?",
  extensions: "What extensions do you want to add to your contract?",
  reactNative: "What type of React Native project do you want to create?",
} as const;

export const GENERATE_MESSAGES = {
  chains: "What chains are you using in your project?",
};

export const ERROR_MESSAGES = {
  noConfiguration:
    "No contract project configuration file found in current directory",
};
