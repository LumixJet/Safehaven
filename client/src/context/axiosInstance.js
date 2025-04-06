import axios from 'axios'; //axios is library to fetch data from backend or to post data to backend

//This is backend URL where our server is running and user data is posted here at this URL 
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000',
});

//setAuthToken is predefined function which is used for setting up tokens for validating data of user 
//which is sent to backend 
export const setAuthToken = (token) => {
  if (token) { //if no token is present then put a token
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else { //if token already exists delete the token to assign a new token
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
};
//to use AxioInstance which determines about(URL and token setup for validation) in entire project 
export default axiosInstance;
