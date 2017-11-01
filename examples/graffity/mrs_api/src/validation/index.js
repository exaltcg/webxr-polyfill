// import Joi from 'joi-browser';

const schema = {
  getLayerById: {
    id: Joi.string().required(),
  },

  getLayers: {
    page: Joi.number().integer().required(),
  },

  getLayersAnchor: {
    id: Joi.string().required(),
    page: Joi.number().integer().required(),
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    elevation: Joi.number().required(),
    radius: Joi.number().required()
  },

  createAnchor: {
    layerId: Joi.string().required(),
    elevation: Joi.number().required(),
    orientation: Joi.array().items(Joi.number()),
    lat: Joi.number().required(),
    lon: Joi.number().required(),
  },

  createObject: {
    id: Joi.string().required(),
    transform: Joi.array().items(Joi.number()).required(),
    modelId: Joi.string().required(),
  },

  getAnchorById: {
    id: Joi.string().required(),
  },

  getAnchorsModels: {
    id: Joi.string().required(),
    page: Joi.number().integer().required(),
  },

  updateObject: {
    transform: Joi.array().items(Joi.number()).required(),
    id: Joi.string().required(),
    modelPoseId: Joi.string().required(),
  },

  deleteObject: {
    id: Joi.string().required(),
    modelPoseId: Joi.string().required(),
  },

  getModelData: {
    id: Joi.string().required(),
  },

  getGalleries: {
    page: Joi.number().integer().required(),
  },

  getGalleryModels: {
    id: Joi.string().required(),
    page: Joi.number().integer().required(),
  },

  createUser: {
    username: Joi.string().required(),
    email: Joi.string().required(),
  },

  getUser: {
    token: Joi.string().required(),
  },

  getUserById: {
    id: Joi.string().required(),
  },

  getModel: {
    id: Joi.string().required(),
  },

  getModelData: {
    id: Joi.string().required(),
  }
};

export default schema;