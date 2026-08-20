# by default nix uses channel that can be different form setup to setup
# pin package tree to ensure every machine has the same outcome

let 
  pkgs = import (builtins.fetchTarball("channel:nixpkgs-unstable")) { inherit overlays; };

  overlays = [
    (self: prevPkgs: {
        nodejs = prevPkgs.nodejs-18_x;
    })
  ];
in pkgs.mkShell {
  # dependencies
  buildInputs = with pkgs; [
    bash coreutils curl jq
    awscli2 sops

    nodejs-18_x
    nodePackages.pnpm
  ];
}
