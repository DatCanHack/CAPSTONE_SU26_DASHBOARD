// Extend File interface to include webkitRelativePath
interface File {
  readonly webkitRelativePath: string;
}

// Extend HTMLInputElement to include webkitdirectory attribute
interface HTMLInputElement {
  webkitdirectory: boolean;
  directory: boolean;
}
