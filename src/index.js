/**
 * @file OlenPEPS sdk: src/index.js
 * @summary The OlenPEPS SDK that eases the access to the API
 * @module Client
 * @copyright Copyright © 2019-2020 Olenergies Montreuil France
 * @author SDL
 * @created Created on Monday July 14th 2020 @ Venizia Ice in Tangier, Morroco
 */
class CoreSDK {
	/**
	 * @summary When >0, logs message to the console.
	 */
	verbose = 0

	/**
	 * @summary Authrization token that has to be push as a token
	 */
	authorizationToken = null

	/**
	 * @summary the cookies
	 */
	//cookies = new Cookies()

	/**
	 * @summary Returns the headers taking into account CSRF security token
	 * @param {boolean} setCookie Sets authorization cookie
	 */
	headers(/*setCookie = true*/) {
		let headers = {
			accepts: 'application/json',
			Accept: 'application/json',
			'Content-Type': 'application/json',
			//'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content')
		}
		/*
		if (setCookie) {
			headers['Authorization'] = "Bearer " + cookies.get('remember_user_token');
		}*/

		return headers
	}

	/**
	 * @summary The infrastructure to use when calling the API.
	 */
	infrastructure = {
		protocol: 'http',
		host: 'localhost',
		port: '5003',
		name: 'Local host',
		production: false,
	}
	/**
	 * @summary Changes the host for the infrastructure to use.
	 *
	 * @param {string} newHost The host to use.
	 */
	setInfrastructure(newInfrastructure) { this.infrastructure = newInfrastructure }


	/**
	 * @summary Returs the url prefxed with the current /api/v1 version.
	 *
	 * @param {string} call Is the API url to invoque
	 * @returns The full API URL.
	 */
	url(call) {
		const port = this.infrastructure.port == 80 ? '': ':'+this.infrastructure.port

		return `${this.infrastructure.protocol}://${this.infrastructure.host}${port}/api/v1${call}`
	}

	/**
	 * @summary Constructs the URL to call.
	 *
	 * @param {string} c The API to call, begining with /.
	 *
	 * @returns The full URL to call
	 */
	callURL(c) {
		const url = this.url(c)
		if (this.verbose>0) console.log(`~~> callURL(${url})`)
		return url
	}



	/**
	 * @summary Invokes the API request.
	 *
	 * @param {string} url The API URL to call.
	 * @param {object} params The fetch param to pass.
	 * @param {object} timeout The maximum time before a timeout occures in ms (Defaults to 10,000ms).
	 *
	 * @returns The promise to get the status code and json.
	 */

	async apiCall(url, params, timeout) {

		url = this.callURL(url)

		if (this.verbose>0) console.log(`~~> apiCall(${url})`)

		// -- Run the request, while watching for given timeout

		let response

		params = {
			...params,
			credentials: 'include',//'same-origin',
		}
		/*
		params.headers = {
			...params.headers,
			cookie: 'accessToken=1234abc; userId=1234'
		}*/

		console.log(`~~> apiCall(${url}) with params: `, params)

		try {
			response = await Promise.race([
				fetch(url, params),

				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Timeout')), timeout || 40000)
				),
			])
		}
		catch (error) {
			if (error.message === 'Timeout'
			||  error.message === 'Network request failed') {
				// retry
				console.log(`*** Error: known error, ${error}`)
				/*
				return {
					responsesStatusCode: 'TIMEOUT',
					error: error,
				}
				*/
				throw error
			}
			else {
				console.log(`*** Error: ${error}`)
				// rethrow other unexpected errors
				throw error
			}
		}


		// -- Now handle response
		if (this.verbose>0) console.log(`reponse: `, response)


		const statusCode = response.status
		const json = response.json()
		return Promise.all([statusCode, json])
		/** @param {[]} a The two-row array which contains the response status code as the first element and the repsonse json in the second */
		.then(a => {
			/** @param {int} code Is the HTTP status code. */
			const responseStatusCode = a[0]

			/** @param {object} json Is the json coming from the server response. */
			const json = a[1] || {}

			// Merges into a single json to return to the caller.
			const _json = {
				responseStatusCode: responseStatusCode,
				...json
			}

			return _json
		})
	}


}


class API extends CoreSDK {
	/**
	 * @summary Get the server tattoo
	 *
	 * @returns The fetch promise
	*/
	tattoo() { return this.apiCall('/tattoo') }


	/**
	 * @summary Ping the server
	 *
	 * @returns The fetch promise
	*/
	ping() { return this.apiCall('/ping') }

	/**
	 * @summary Log the user in.
	 *
	 * @param {string} email The email address of the user to sign in.
	 * @param {string} password The password of the user to sign in.
	 *
	 * @returns The fetch promise.
	 * @throws 401 error whenever there user is unknown.
	 */
	login(email, password) { return this.apiCall('/login', {
		method: 'POST',
		headers: this.headers(false),
		body: JSON.stringify({
			email: email,
			password: password
		}),
	})}


	/**
	 * @summary Log the user out.
	 *
	 * @returns The fetch promise.
	 * @throws 401 error whenever there user is unknown.
	 */
	logout() { return  this.apiCall('/logout') }

	/**
	 * @summary Check the current user's authorization.
	 *
	 * @returns The fetch promise.
	 * @throws 401 error whenever there user is not authentificated.
	 */
	checkAuth() { return this.apiCall('/checkAuth') }



/**
	 * @summary Get all installations.
	 *
	 * @returns The fetch promise.
	 * @throws 401 error whenever there user is not authentificated.
	 */
	readInstallations() { return this.apiCall('/installations') }

	/**
	 * @summary Get installation sensors extended telemetry
	 *
	 * @returns The fetch promise.
	 * @throws 401 error whenever there user is not authentificated.
	 */
	readExtendedTelemetry(installationId, devices) {
		return this.apiCall(`/telemetry/${installationId}?extended=true`, {
			method: 'POST',
			headers: this.headers(false),
			body: JSON.stringify({ devices: devices })
		}, 60000)
	}

	/**
	 * @summary Get installation sensors telemetry.
	 *
	 * @returns The fetch promise.
	 * @throws 401 error whenever there user is not authentificated.
	 */
	readTelemetry(installationId, devices) {
		return this.apiCall(`/telemetry/${installationId}?extended=false`, {
			method: 'POST',
			headers: this.headers(false),
			body: JSON.stringify({ devices:devices })
		}, 60000)
	}
}



/**
 * @summary Access to Victon API related to the installations
 */
class APIVictron extends CoreSDK {

	constructor() {
		super()
		this.prefix = '/victron'
	}



/**
	 * @summary Get all installations.
	 *
	 * @returns The fetch promise.
	 * @throws 401 error whenever there user is not authentificated.
	 */
	readInstallations() { return this.apiCall(this.prefix+'/installations') }
}



/**
 * @summary Access to Edison API related to the installations
 */
class APIEdison extends CoreSDK {

	constructor() {
		super()
		this.prefix = '/edison'
	}



/**
	 * @summary Get installation sensors telemetry
	 * @deprecated Deprecated and removed since Alaska v1.0b7
	 * @returns The fetch promise.
	 * @throws 401 error whenever there user is not authentificated.
	 */
	readTelemetry(installationId) { return this.apiCall(this.prefix+`/battery/monitoring/?installationId=${installationId}`) }

}







// class DEVAPI extends CoreSDK {

// 	/**
// 	 * @summary Read the db table
// 	 * @param { string } tablename The tablename to read the content from.
// 	 * @returns The fetch promise
// 	*/
// 	readDBTable(tablename) { return this.apiCall(`/dbtable/${tablename}`) }
// }





class SDKPostgreSql extends CoreSDK {

	/**
	 * @summary Read the db table
	 * @param { string } tablename The tablename to read the content from.
	 * @returns The fetch promise
	*/
	readDBTable(tablename) { return this.apiCall(`/db/postgresql/table/${tablename}`) }


	/**
	 * @summary Test the connection to the PostgreSql server
	 * @returns The fetch promise
	*/
	testConnection() { return this.apiCall('/db/postgresql/testconnection') }
}


/**
 * The APi singleton to use thoughout the client or server side.
 */
const OlenPEPS = {
	api:		new API(),

	victron:	new APIVictron(),
	edison:		new APIEdison(),

	postgreSql:	new SDKPostgreSql(),
}

export default OlenPEPS

/**
* Adds two numbers and returns the result in poop emoji.
* @param {Number} a First number
* @param {Number} b Second number
*/
export const spongepoop = (a, b) => '💩'.repeat(a + b)

