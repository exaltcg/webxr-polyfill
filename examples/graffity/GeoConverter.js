export default class GeoConverter {
    constructor() {
        this.eastUpSouthToFixedFrame = Cesium.Transforms.localFrameToFixedFrameGenerator('east','up');
        this.eastUpSouthToFixedFrameMatrix = null;
        this.eastUpSouthToFixedFrameInverseMatrix = null;
        this.origin = {
            lla: null,
            ecef: null
        };
    }

    setOriginFromDegrees(longitude, latitude, elevation) {
        this.origin.lla = Cesium.Cartographic.fromDegrees(longitude, latitude, elevation);
        this.origin.ecef = Cesium.Cartesian3.fromDegrees(longitude, latitude, elevation);

        this.eastUpSouthToFixedFrameMatrix = this.eastUpSouthToFixedFrame(this.origin.ecef);
        this.eastUpSouthToFixedFrameInverseMatrix = Cesium.Matrix4.inverseTransformation(
            this.eastUpSouthToFixedFrameMatrix,
            new Cesium.Matrix4()
        );
    }

    llaToEcef(latitude, longitude, elevation) {
        let ecef = Cesium.Cartesian3.fromDegrees(longitude, latitude, elevation);
        return {
            x: ecef.x,
            y: ecef.y,
            z: ecef.z
        };
    }

    ecefToLla(x, y, z) {
        let ecef = new Cesium.Cartesian3(x, y, z);
        let lla = Cesium.Cartographic.fromCartesian(ecef);
        return {
            longitude: Cesium.Math.toDegrees(lla.longitude),
            latitude: Cesium.Math.toDegrees(lla.latitude),
            elevation: lla.height
        };
    }

    ecefToEastUpSouth(x, y, z, originX = null, originY = null, originZ = null) {
        let transformMatrix;
        if (originX == null) {
            transformMatrix = this.eastUpSouthToFixedFrameInverseMatrix;
        } else {
            let transformToFixedMatrix = this.obtainEastUpSouthToFixedFrameMatrix(originX, originY, originZ);
            transformMatrix = Cesium.Matrix4.inverseTransformation(transformToFixedMatrix, new Cesium.Matrix4());
        }

        let ecef = new Cesium.Cartesian3(x, y, z);
        let eastUpSouth = Cesium.Matrix4.multiplyByPoint(
            transformMatrix,
            ecef,
            new Cesium.Cartesian3()
        );

        return {
            x: eastUpSouth.x,
            y: eastUpSouth.y,
            z: eastUpSouth.z
        };
    }

    eastUpSouthToEcef(x, y, z, originX = null, originY = null, originZ = null) {
        let transformMatrix;
        if (originX == null) {
            transformMatrix = this.eastUpSouthToFixedFrameMatrix;
        } else {
            transformMatrix = this.obtainEastUpSouthToFixedFrameMatrix(originX, originY, originZ);
        }

        let eastUpSouth = new Cesium.Cartesian3(x, y, z);
        let ecef = Cesium.Matrix4.multiplyByPoint(
            transformMatrix,
            eastUpSouth,
            new Cesium.Cartesian3()
        );

        return {
            x: ecef.x,
            y: ecef.y,
            z: ecef.z
        }
    }

    obtainEastUpSouthToFixedFrameMatrix(originX, originY, originZ) {
        let origin = new Cesium.Cartesian3(originX, originY, originZ);
        return this.eastUpSouthToFixedFrame(origin);
    }
}
