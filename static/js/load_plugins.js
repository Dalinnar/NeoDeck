const MANIFEST_URL = "https://api.github.com/repos/Dalinnar/NeoDeck-plugins/contents/manifest.json";

fetch(MANIFEST_URL, { headers: { "Accept": "application/vnd.github.v3.raw" } })
    .then(response => {
        if (!response.ok) throw new Error("Error fetching manifest: " + response.status);
        return response.json();
    })
    .then(manifest => {
        const grid = document.getElementById("plugin-grid");

        Object.entries(manifest).forEach(([slug, plugin]) => {
            const pluginDiv = document.createElement("div");
            pluginDiv.classList.add("plugin-item");
            pluginDiv.style.cursor = "pointer";

            pluginDiv.addEventListener("click", () => {
                window.location.href = `/plugin/${slug}`;
            });

            // Icon — loaded directly from icon_url in manifest
            const icon = document.createElement("img");
            icon.alt = plugin.plugin_name;
            icon.classList.add("plugin-icon");
            icon.src = plugin.icon_url;
            icon.onerror = () => { icon.src = "/assets/default-plugin-icon.jpg"; };

            // Data container
            const data_container = document.createElement("div");
            data_container.classList.add("data_container");

            // Name
            const name = document.createElement("h3");
            name.textContent = plugin.plugin_name.replace(/_/g, " ");
            name.classList.add("plugin-name");

            // Description
            const desc = document.createElement("p");
            desc.textContent = plugin.description;
            desc.classList.add("plugin-desc");

            // Version + creators
            const meta = document.createElement("small");
            const creators = Array.isArray(plugin.creators)
                ? plugin.creators.join(", ")
                : plugin.creators;
            meta.textContent = `v${plugin.latest_version} • ${creators}`;
            meta.classList.add("plugin-meta");

            // Assemble
            pluginDiv.appendChild(icon);
            pluginDiv.appendChild(data_container);
            data_container.appendChild(name);
            data_container.appendChild(desc);
            data_container.appendChild(meta);



            grid.appendChild(pluginDiv);
        });
    })
    .catch(error => {
        console.error("Error:", error);
    });