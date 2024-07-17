import { app } from "/scripts/app.js"
import { api } from "/scripts/api.js";

function imageDataToUrl(data) {
    return api.apiURL(`/view?filename=${encodeURIComponent(data.filename)}&type=${data.type}&subfolder=${data.subfolder}${app.getPreviewFormatParam()}${app.getRandParam()}`);
}

const ext = {
    uniqueID: 0,
    name: "YC.PreviewMagnifier",
    async init(app) {
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "YC.PreviewImageMagnifier") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = async function () {
                const r = onNodeCreated
                    ? onNodeCreated.apply(this, arguments)
                    : undefined
                const id = ext.uniqueID++
                const result = await createWidget(this, app, id)
                this.setSize([400, 400])
                return r
            }

            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                onExecuted === null || onExecuted === void 0 ? void 0 : onExecuted.apply(this, [message]);
                const data = message.a_images[0];
                const url = imageDataToUrl(data);
                this.imageWidget.children[0].children[0].src = url;
                // send get to the image url to get the image and then get width and height
                fetch(url).then(r => r.blob()).then(blob => {
                    const url = URL.createObjectURL(blob);
                    const img = new Image();
                    img.src = url;
                    img.onload = () => {
                        // clip the size to ensure the longest size smaller than 200
                        const aspectRatio = img.width / img.height;
                        if (aspectRatio > 1) {
                            this.setSize([400, 400 / aspectRatio]);
                        } else {
                            this.setSize([400 * aspectRatio, 400]);
                        }
                    }
                });
            }
        }
    },
};

async function createWidget(node, app, id) {
    const element = document.createElement('div');

    const img = document.createElement('img');
    img.src = "http://upload.wikimedia.org/wikipedia/commons/9/94/Starry_Night_Over_the_Rhone.jpg";

    img.style.width = "100%";
    img.style.height = "100%";


    let subDiv = document.createElement('div');
    subDiv.style.width = "100%";
    subDiv.style.height = "100%";
    subDiv.style.margin = "auto";

    subDiv.appendChild(img);

    let magnifier = document.createElement('div');
    magnifier.style.position = "absolute";
    magnifier.style.display = "none";
    magnifier.hidden = true;
    magnifier.style.border = "2px solid #000";
    magnifier.style.borderRadius = "15%";
    magnifier.style.pointerEvents = "none";



    const hideMagnifier = () => {
        magnifier.style.display = "none";
        magnifier.hidden = true;
    }

    const magnify = (e) => {
        magnifier.style.display = "block";
        magnifier.hidden = false;

        let zoomFactor = 3;
        let windowSizeX = 0.33;
        let windowSizeY = 0.33;

        let x = e.offsetX;
        let y = e.offsetY;
        let xPercent = x / e.toElement.offsetWidth;
        let yPercent = y / e.toElement.offsetHeight;

        // Clamp values to be inside the box
        xPercent = Math.max(windowSizeX / 2, Math.min(xPercent, 1.0 - windowSizeX / 2));
        yPercent = Math.max(windowSizeY / 2, Math.min(yPercent, 1.0 - windowSizeY / 2));
        x = xPercent * e.toElement.width;
        y = yPercent * e.toElement.height;



        magnifier.style.backgroundImage = `url(${img.src})`;

        // Calculate the position for the background image
        const bgX = (xPercent * img.offsetWidth);
        const bgY = (yPercent * img.offsetHeight);

        magnifier.style.boxSizing = "border-box";
        const edge = Math.min(img.offsetWidth, img.offsetHeight);
        magnifier.style.width = (windowSizeX * edge * zoomFactor) + 'px';
        magnifier.style.height = (windowSizeY * edge * zoomFactor) + 'px';

        const magnifierRect = magnifier.getBoundingClientRect();

        magnifier.style.left = (x - magnifier.offsetWidth / 2 + img.offsetLeft) + 'px';
        magnifier.style.top = (y - magnifier.offsetHeight / 2 + img.offsetTop) + 'px';

        magnifier.style.backgroundSize = `${img.offsetWidth * zoomFactor}px ${img.offsetHeight * zoomFactor}px`;
        let bgTrueX = Math.max(0, bgX * zoomFactor - magnifier.offsetWidth / 2);
        let bgTrueY = Math.max(0, bgY * zoomFactor - magnifier.offsetHeight / 2);
        magnifier.style.backgroundPosition = '-' + (bgTrueX) + 'px -' + (bgTrueY) + 'px';

    }
    subDiv.appendChild(magnifier);

    img.addEventListener('mousemove', (e) => magnify(e));
    img.addEventListener('mouseleave', (e) => hideMagnifier());

    element.appendChild(subDiv);

    const widget = {
        type: "image-widget",
        name: "image-widget-" + id,
        draw: function (ctx, node, widgetWidth, y, widgetHeight) {
            const hidden =
                node.flags?.collapsed ||
                app.canvas.ds.scale < 0.5 ||
                widget.computedHeight <= 0 ||
                widget.type === "converted-widget" ||
                widget.type === "hidden";
            element.hidden = hidden;
            element.style.display = hidden ? "none" : "flex";

            if (hidden) {
                return;
            }

            const margin = 10;
            // ctx.canvas is the Global Canvas to draw nodes
            const elRect = ctx.canvas.getBoundingClientRect();
            // getting the transformation matrix of the node
            const t = ctx.getTransform();

            const transform = new DOMMatrix()
                .scaleSelf(elRect.width / ctx.canvas.width, elRect.height / ctx.canvas.height)
                .multiplySelf(ctx.getTransform())
                .translateSelf(margin, margin + y);


            const aspectRatio = img.naturalWidth / img.naturalHeight;

            // Calculate maximum available width and height
            const maxWidth = Math.max(0, node.size[0] - margin * 4);
            const maxHeight = Math.max(0, node.size[1] - margin * 5 - widgetHeight);

            // Calculate dimensions while maintaining aspect ratio
            let width = maxWidth;
            let height = width / aspectRatio;

            // If height exceeds maxHeight, scale down
            if (height > maxHeight) {
                height = maxHeight;
                width = height * aspectRatio;
            }

            // Ensure positive dimensions
            width = Math.max(0, width);
            height = Math.max(0, height);

            Object.assign(element.style, {
                left: `${transform.a * margin + transform.e}px`,
                top: `${transform.d * margin + transform.f}px`,
                width: `${(maxWidth * transform.a)}px`,
                height: `${(maxHeight * transform.d)}px`,
                position: "absolute",
                zIndex: app.graph._nodes.indexOf(node),
            });

            Object.assign(subDiv.style, {
                width: `${width * transform.a}px`,
                height: `${height * transform.d}px`,
            });

        },
    };
    document.body.appendChild(element);
    element.hidden = true;
    element.style.display = "none";
    element.style.justifyContent = "center";
    element.style.alignItems = "center";
    element.style.backgroundColor = "white";
    node.addCustomWidget(widget);

    const collapse = node.collapse;
    node.collapse = function () {
        collapse.apply(this, arguments);
        if (this.flags?.collapsed) {
            element.hidden = true;
            element.style.display = "none";
        }
    }

    const onRemoved = node.onRemoved;
    node.onRemoved = function () {
        element.remove();
        onRemoved?.apply(this, arguments);
    };

    node.imageWidget = element;
}

app.registerExtension(ext);
