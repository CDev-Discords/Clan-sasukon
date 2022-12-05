{ pkgs }: {
	deps = [
		pkgs.nodejs-16_x
    pkgs.python38Full
        pkgs.nodePackages.typescript-language-server
        pkgs.yarn
        pkgs.replitPackages.jest
		libpng
		libjpeg
		libuuid
	];
}