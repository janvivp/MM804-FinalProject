// Importing necessary libraries
import "@kitware/vtk.js/favicon";
import "@kitware/vtk.js/Rendering/Profiles/Volume";
import "@kitware/vtk.js/Rendering/Profiles/Geometry";
import vtkBoundingBox from "@kitware/vtk.js/Common/DataModel/BoundingBox";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkVolumeController from "@kitware/vtk.js/Interaction/UI/VolumeController";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkXMLImageDataReader from "@kitware/vtk.js/IO/XML/XMLImageDataReader";
import "@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper";
import "@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper";
import "@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper";
import vtkImageMarchingCubes from "@kitware/vtk.js/Filters/General/ImageMarchingCubes";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import controlPanel from "./controlPanel.html";

var fullScreenRenderer1, fullScreenRenderer3;
var renderWindow;
var actor;

function emptyContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function setupIso({ renderer3, renderWindow3, dataRange, fileContents }) {
  const actor2 = vtkActor.newInstance();
  const mapper2 = vtkMapper.newInstance();
  //initializing marchingcube
  const marchingCube = vtkImageMarchingCubes.newInstance({
    contourValue: 0.0,
    computeNormals: true,
    mergePoints: true,
  });

  actor2.setMapper(mapper2);
  mapper2.setInputConnection(marchingCube.getOutputPort());
  //function to update isoValue
  function updateIsoValue(e) {
    const isoValue = Number(e.target.value);
    marchingCube.setContourValue(isoValue);
    renderWindow3.render();
  }
  //reading the data
  const vtiReader = vtkXMLImageDataReader.newInstance({ loadData: true });
  vtiReader.parseAsArrayBuffer(fileContents);

  marchingCube.setInputConnection(vtiReader.getOutputPort());

  const firstIsoValue = (dataRange[0] + dataRange[1]) / 3;

  const el = document.querySelector(".isoValue");
  el.setAttribute("min", dataRange[0]);
  el.setAttribute("max", dataRange[1]);
  el.setAttribute("value", firstIsoValue);
  el.addEventListener("input", updateIsoValue);
  marchingCube.setContourValue(firstIsoValue);

  //setting the camera and renderwindow
  renderer3.addActor(actor2);
  renderer3.getActiveCamera().set({ position: [1, 1, 0], viewUp: [0, 0, -1] });
  renderer3.resetCamera();
  renderWindow3.render();
  // });
  //making some variables global
  global.actor = actor2;
  global.mapper = mapper2;
  global.marchingCube = marchingCube;
}

function createViewer(rootContainer, fileContents) {
  const controls = document.getElementById("controls");

  var select = document.createElement("select");
  var options = ["Gaussian Widget", "Volume Contour"];
  options.forEach(function (optionText) {
    var option = document.createElement("option");
    option.text = optionText;
    select.add(option);
  });
  controls.appendChild(select);

  select.addEventListener("change", (e) => {
    const renderers = {
      fullScreenRenderer1,
      fullScreenRenderer3,
    };
    let selectedKey = "";
    const controllerWidgetDiv = document.getElementById("controllerWidgetDiv");
    switch (e.target.value) {
      case "Gaussian Widget":
        customizeWidget("Gaussian Widget");
        selectedKey = "fullScreenRenderer1";
        controllerWidgetDiv.style.zIndex = 2;
        break;
      case "Volume Contour":
        customizeWidget("Volume Contour");
        selectedKey = "fullScreenRenderer3";
        controllerWidgetDiv.style.zIndex = 0;
        break;
    }
    if (selectedKey) {
      const renderToShow = renderers[selectedKey];
      renderToShow.getContainer().style.zIndex = "1";
      renderToShow.resize();
      Object.keys(renderers)
        .filter((x) => x != selectedKey)
        .forEach((key) => {
          const renderToHide = renderers[key];
          if (renderToHide) {
            renderToHide.getContainer().style.zIndex = "0";
            renderToHide.resize();
          }
        });
    }
  });

  const div1 = document.createElement("div");
  rootContainer.appendChild(div1);

  const div3 = document.createElement("div");
  rootContainer.appendChild(div3);

  //setting background color
  const background = [0, 0, 0];

  rootContainer.classList.add("content");

  fullScreenRenderer1 = vtkFullScreenRenderWindow.newInstance({
    background,
    rootContainer: div1,
  });

  fullScreenRenderer3 = vtkFullScreenRenderWindow.newInstance({
    background,
    rootContainer: div3,
  });

  const renderer = fullScreenRenderer1.getRenderer();
  renderWindow = fullScreenRenderer1.getRenderWindow();
  renderWindow.getInteractor().setDesiredUpdateRate(15);

  fullScreenRenderer1.getContainer().style.height = "90%";
  fullScreenRenderer1.getContainer().style.width = "90%";
  fullScreenRenderer1.getContainer().style.zIndex = "1";
  fullScreenRenderer1.resize();

  fullScreenRenderer3.getContainer().style.height = "90%";
  fullScreenRenderer3.getContainer().style.width = "90%";
  fullScreenRenderer3.getContainer().style.zIndex = "0";
  fullScreenRenderer3.resize();

  const vtiReader = vtkXMLImageDataReader.newInstance({ fetchGzip: true });
  vtiReader.parseAsArrayBuffer(fileContents);

  const source = vtiReader.getOutputData();
  const mapper = vtkVolumeMapper.newInstance();
  actor = vtkVolume.newInstance();

  const dataArray =
    source.getPointData().getScalars() || source.getPointData().getArrays()[0];
  const dataRange = dataArray.getRange();

  const lookupTable = vtkColorTransferFunction.newInstance();
  const piecewiseFunction = vtkPiecewiseFunction.newInstance();
  fullScreenRenderer1.addController(controlPanel);

  actor.setMapper(mapper);
  mapper.setInputData(source);
  renderer.addActor(actor);

  const renderer3 = fullScreenRenderer3.getRenderer();
  const renderWindow3 = fullScreenRenderer3.getRenderWindow();
  setupIso({
    renderer3,
    renderWindow3,
    dataRange,
    fileContents,
  });

  // Configuration
  const sampleDistance =
    0.7 *
    Math.sqrt(
      source
        .getSpacing()
        .map((v) => v * v)
        .reduce((a, b) => a + b, 0)
    );
  mapper.setSampleDistance(sampleDistance);
  actor.getProperty().setRGBTransferFunction(0, lookupTable);
  actor.getProperty().setScalarOpacity(0, piecewiseFunction);
  actor.getProperty().setInterpolationTypeToFastLinear();
  actor.getProperty().setInterpolationTypeToLinear();

  // For better looking volume rendering
  actor
    .getProperty()
    .setScalarOpacityUnitDistance(
      0,
      vtkBoundingBox.getDiagonalLength(source.getBounds()) /
        Math.max(...source.getDimensions())
    );

  actor.getProperty().setGradientOpacityMinimumValue(0, 0);
  actor
    .getProperty()
    .setGradientOpacityMaximumValue(0, (dataRange[1] - dataRange[0]) * 0.05);

  //setting shading based on gradient
  actor.getProperty().setShade(true);
  actor.getProperty().setUseGradientOpacity(0, true);

  //setting the deafault values
  actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
  actor.getProperty().setGradientOpacityMaximumOpacity(0, 1.0);
  actor.getProperty().setAmbient(0.2);
  actor.getProperty().setDiffuse(0.7);
  actor.getProperty().setSpecular(0.3);
  actor.getProperty().setSpecularPower(8.0);

  //initializing control widget and UI
  const controllerWidgetDiv = document.createElement("div");
  controllerWidgetDiv.id = "controllerWidgetDiv";
  rootContainer.append(controllerWidgetDiv);
  customizeWidget("Gaussian Widget");

  // First render
  renderer.resetCamera();
  renderWindow.render();

  global.pipeline = {
    actor,
    renderer,
    renderWindow,
    lookupTable,
    mapper,
    source,
    piecewiseFunction,
    fullScreenRenderer: fullScreenRenderer1,
  };
}

function customizeWidget(key) {
  const widgetContainer = document.getElementById("controllerWidgetDiv");
  emptyContainer(widgetContainer);
  const controllerWidgetDiv = document.createElement("div");
  const isoWidget = document.getElementById("isoWidget");
  switch (key) {
    case "Gaussian Widget":
      controllerWidgetDiv.style.zIndex = 2;
      controllerWidgetDiv.style.position = "absolute";
      widgetContainer.append(controllerWidgetDiv);
      const controllerWidget = vtkVolumeController.newInstance({
        size: [280, 150],
        rescaleColorMap: true,
      });
      controllerWidget.setContainer(controllerWidgetDiv);

      // setUpContent sets the size to the container.
      controllerWidget.setupContent(renderWindow, actor, true);
      fullScreenRenderer1.setResizeCallback(({ width, height }) => {
        controllerWidget.render();
      });
      isoWidget.style.display = "none";
      break;
    case "Volume Contour":
      isoWidget.style.display = "block";
      break;
  }
}

function load(container, options) {
  emptyContainer(container);

  if (options.file) {
    if (options.ext === "vti") {
      const reader = new FileReader();
      reader.onload = function onLoad(e) {
        createViewer(container, reader.result);
      };
      reader.readAsArrayBuffer(options.file);
    }  else {
      console.error("Unkown file...");
    }
  }
}

setTimeout(() => {
  const container = document.getElementById("content");
  const fileInput = document.querySelector("input");

  function handleFile(e) {
    preventDefaults(e);
    const dataTransfer = e.dataTransfer;
    const files = e.target.files || dataTransfer.files;
    if (files.length === 1) {
      const ext = files[0].name.split(".").slice(-1)[0];
      const options = { file: files[0], ext };
      load(container, options);
    }
  }
  fileInput.addEventListener("change", handleFile);
}, 1000);
