import { app } from "/scripts/app.js"
import { api } from "/scripts/api.js";

function imageDataToUrl(data) {
    return api.apiURL(`/view?filename=${encodeURIComponent(data.filename)}&type=${data.type}&subfolder=${data.subfolder}${app.getPreviewFormatParam()}${app.getRandParam()}`);
}



function updateNodeHeight(node) { node.setSize([node.size[0], node.computeSize()[1]]); }


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
                const result = await createPreviewImageWidget(this, app, id)
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

        if (nodeData.name === "YC.ImageComparerMagnifier") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = async function () {
                const r = onNodeCreated
                    ? onNodeCreated.apply(this, arguments)
                    : undefined
                const id = ext.uniqueID++
                overrideGetSetter(this, id)
                const result = await createImageComparerWidget(this, app, id)
                this.setSize([400, 400])
                return r
            }

            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                onExecuted === null || onExecuted === void 0 ? void 0 : onExecuted.apply(this, [message]);
                for (let i = 0; i < this.inputs.length; i++) {
                    const data = message[`image_${i}`][0];
                    const url = imageDataToUrl(data);
                    this.comparerWidget.children[i].children[0].src = url;
                }
            }
        }
    },
};

const image_inputs = [
    ["image_0", "IMAGE"],
    ["image_1", "IMAGE"],
    ["image_2", "IMAGE"],
    ["image_3", "IMAGE"],
]

function updateNodeByImageCountWidget(node, widget) {
    let number_to_show = Math.min(widget.value, image_inputs.length)
    let inputs = node.inputs
    let inputs_length = inputs.length
    if (inputs_length < number_to_show) {
        for (let i = inputs_length; i < number_to_show; i++) {
            let input = image_inputs[i]
            node.addInput(input[0], input[1])
        }
    } else if (inputs_length > number_to_show) {
        node.inputs = inputs.slice(0, number_to_show)
    }
    updateNodeHeight(node)
}


function overrideGetSetter(node, id) {
    if (node.widgets)
        for (const w of node.widgets) {
            if (w.name === 'img_count') {
                updateNodeByImageCountWidget(node, w)
                let widgetValue = w.value;

                // Define getters and setters for widget values
                Object.defineProperty(w, 'value', {
                    get() {
                        return widgetValue;
                    },
                    set(newVal) {
                        if (newVal !== widgetValue) {
                            widgetValue = newVal;
                            updateNodeByImageCountWidget(node, w)
                        }
                    }
                });
            }
        }
}

async function createPreviewImageWidget(node, app, id) {
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

function createSubDiv() {
    let subDiv = document.createElement('div');
    // subDiv.style.width = "100%";
    // subDiv.style.height = "100%";
    subDiv.style.margin = "5px";

    const img = document.createElement('img');
    img.src = "http://upload.wikimedia.org/wikipedia/commons/9/94/Starry_Night_Over_the_Rhone.jpg";
    img.style.width = "100%";
    img.style.height = "100%";
    subDiv.appendChild(img);

    let magnifier = document.createElement('div');
    magnifier.style.position = "absolute";
    magnifier.style.display = "none";
    magnifier.hidden = true;
    magnifier.style.border = "2px solid #000";
    magnifier.style.borderRadius = "15%";
    magnifier.style.pointerEvents = "none";
    magnifier.style.boxSizing = "border-box";
    subDiv.appendChild(magnifier);

    return [subDiv, img, magnifier];
}

async function createImageComparerWidget(node, app, id) {
    const element = document.createElement('div');

    const [subDiv1, img1, magnifier1] = createSubDiv();
    const [subDiv2, img2, magnifier2] = createSubDiv();

    element.appendChild(subDiv1);
    element.appendChild(subDiv2);

    const magnifiers = [magnifier1, magnifier2];
    const imgs = [img1, img2];
    const subDivs = [subDiv1, subDiv2];

    const hideMagnifier = () => {
        for (let i = 0; i < 2; i++) {
            magnifiers[i].style.display = "none";
            magnifiers[i].hidden = true;
        }
    }

    const magnify = (e, idx) => {
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

        const img = imgs[idx];
        const magnifier = magnifiers[idx];
        // Calculate the position for the background image
        const bgX = (xPercent * img.offsetWidth);
        const bgY = (yPercent * img.offsetHeight);
        const edge = Math.min(img.offsetWidth, img.offsetHeight);
        const magnifierWidth = windowSizeX * edge * zoomFactor;
        const magnifierHeight = windowSizeY * edge * zoomFactor;
        let bgTrueX = Math.max(0, bgX * zoomFactor - magnifier.offsetWidth / 2);
        let bgTrueY = Math.max(0, bgY * zoomFactor - magnifier.offsetHeight / 2);


        for (let i = 0; i < 2; i++) {
            const magnifier = magnifiers[i];
            const img = imgs[i];

            magnifiers[i].style.display = "block";
            magnifiers[i].hidden = false;

            magnifier.style.backgroundImage = `url(${img.src})`;
            magnifier.style.width = magnifierWidth+ 'px';
            magnifier.style.height = magnifierHeight + 'px';
            magnifier.style.left = (x - magnifier.offsetWidth / 2 + img.offsetLeft) + 'px';
            magnifier.style.top = (y - magnifier.offsetHeight / 2 + img.offsetTop) + 'px';

            magnifier.style.backgroundSize = `${img.offsetWidth * zoomFactor}px ${img.offsetHeight * zoomFactor}px`;
            magnifier.style.backgroundPosition = '-' + (bgTrueX) + 'px -' + (bgTrueY) + 'px';
        }

    }

    for (let i = 0; i < 2; i++) {
        imgs[i].addEventListener('mousemove', (e) => magnify(e, i));
        imgs[i].addEventListener('mouseleave', (e) => hideMagnifier());
    }

    element.appendChild(subDiv1);
    element.appendChild(subDiv2);

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


            const aspectRatio = imgs[0].naturalWidth / imgs[0].naturalHeight;

            let extraMargin = 0;
            if (node.inputs.length == 3) {
                extraMargin = 1.5 * margin;
            } else if (node.inputs.length == 4) {
                extraMargin = 4 * margin;
            }
            // Calculate maximum available width and height
            const maxWidth = Math.max(0, node.size[0] - margin * 4);
            const maxHeight = Math.max(0, node.size[1] - margin * 8 - extraMargin - widgetHeight);

            // Calculate dimensions while maintaining aspect ratio
            let width = (maxWidth) / 2 - 10;
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

            for (let i = 0; i < 2; i++) {
                const subDiv = subDivs[i];
                Object.assign(subDiv.style, {
                    width: `${width * transform.a}px`,
                    height: `${height * transform.d}px`,
                });
            }
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

    node.comparerWidget = element;
}

app.registerExtension(ext);
